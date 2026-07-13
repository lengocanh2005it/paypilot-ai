import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { CopilotQuotaManager } from '../../common/services/copilot-quota-manager';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AiUsageLogService } from './ai-usage-log.service';
import { ChatProviderService } from './chat-provider.service';
import {
  buildActivities,
  COPILOT_INITIAL_STREAM_ACTIVITY,
  getStreamingActivityMeta,
} from './copilot-activity.helper';
import type { CopilotAgentHarness } from './copilot-agent.harness';
import { CopilotAgentFactoryService } from './copilot-agent-factory.service';
import { CopilotConversationService } from './copilot-conversation.service';
import {
  CopilotConversationSetupService,
  type CopilotStreamMessage,
} from './copilot-conversation-setup.service';
import type { ToolActivityMeta } from './copilot-tool.types';
import { CopilotToolDepsProvider } from './copilot-tool-deps.provider';
import { OpenAiService } from './openai.service';
import { isQuotaOrBillingError } from './utils/llm-error.util';
import { appendFallbackNotice, sanitizeCopilotOutput } from './utils/llm-output.util';

type ActivityList = ReturnType<typeof buildActivities>;
type SubMeta = { id: string; copilotQuota: number } | undefined;

/** One turn of the copilot conversation, streamed as a sequence of events. */
export type TurnEvent =
  | { type: 'activity'; meta: ToolActivityMeta }
  | { type: 'delta'; content: string }
  | {
      type: 'done';
      reply: string;
      meta: { activities: ActivityList } | undefined;
      conversationId: string;
    }
  | { type: 'partial'; reply: string };

/**
 * Single-slot async pull queue bridging the tool-runner's push-based events
 * (EventEmitter callbacks firing during a single long-lived await) into the
 * pull-based AsyncGenerator that runTurn() exposes to its callers.
 */
class TurnEventQueue {
  private readonly pending: TurnEvent[] = [];
  private waiting: ((result: IteratorResult<TurnEvent>) => void) | null = null;
  private waitingReject: ((err: unknown) => void) | null = null;
  private ended = false;
  private hasFatalError = false;
  private fatalError: unknown;

  push(event: TurnEvent): void {
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = this.waitingReject = null;
      resolve({ value: event, done: false });
    } else {
      this.pending.push(event);
    }
  }

  /** Ends the queue with a fatal error — the next `next()` call rejects instead of completing. */
  fail(err: unknown): void {
    this.hasFatalError = true;
    this.fatalError = err;
    this.ended = true;
    if (this.waitingReject) {
      const reject = this.waitingReject;
      this.waiting = this.waitingReject = null;
      reject(err);
    }
  }

  end(): void {
    this.ended = true;
    if (this.waiting) {
      const resolve = this.waiting;
      this.waiting = this.waitingReject = null;
      resolve({ value: undefined, done: true });
    }
  }

  next(): Promise<IteratorResult<TurnEvent>> {
    if (this.pending.length > 0)
      return Promise.resolve({ value: this.pending.shift()!, done: false });
    if (this.hasFatalError) return Promise.reject(this.fatalError);
    if (this.ended) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve, reject) => {
      this.waiting = resolve;
      this.waitingReject = reject;
    });
  }
}

@Injectable()
export class CopilotStreamService {
  private readonly logger = new Logger(CopilotStreamService.name);

  constructor(
    private readonly openAiService: OpenAiService,
    private readonly chatProvider: ChatProviderService,
    private readonly agentFactory: CopilotAgentFactoryService,
    private readonly conversationService: CopilotConversationService,
    private readonly setupService: CopilotConversationSetupService,
    private readonly quotaManager: CopilotQuotaManager,
    private readonly aiUsageLogService: AiUsageLogService,
    private readonly toolDepsProvider: CopilotToolDepsProvider,
  ) {}

  /** JSON path — drains one turn to its final reply. */
  async chat(
    user: AuthenticatedUser,
    dto: CopilotStreamMessage,
    subMeta: SubMeta,
  ): Promise<{
    reply: string;
    meta: { activities: ActivityList } | undefined;
    conversationId: string;
  }> {
    let last: Extract<TurnEvent, { type: 'done' }> | undefined;
    for await (const event of this.runTurn({ user, dto, subMeta })) {
      if (event.type === 'done') last = event;
    }
    if (!last) throw new Error('Copilot turn kết thúc mà không có phản hồi');
    return { reply: last.reply, meta: last.meta, conversationId: last.conversationId };
  }

  /** SSE path — writes each turn event as an SSE frame as it happens. */
  async streamChat(
    user: AuthenticatedUser,
    dto: CopilotStreamMessage,
    subMeta: SubMeta,
    res: Response,
    reqOnClose: (cb: () => void) => void,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      (res as unknown as { flush?: () => void }).flush?.();
    };

    res.flushHeaders();

    const controller = new AbortController();
    reqOnClose(() => controller.abort());

    try {
      for await (const event of this.runTurn({ user, dto, subMeta, signal: controller.signal })) {
        if (event.type === 'activity') writeEvent('activity', event.meta);
        else if (event.type === 'delta') writeEvent('delta', { content: event.content });
        else if (event.type === 'done')
          writeEvent('done', {
            reply: event.reply,
            meta: event.meta,
            conversationId: event.conversationId,
          });
        // 'partial' events are already persisted inside runTurn — nothing left to write.
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  private async finalizeChat(opts: {
    conversationId: string;
    reply: string;
    activities: ActivityList;
    tenantId: string;
    subMeta: SubMeta;
    isNewConv: boolean;
    dto: CopilotStreamMessage;
    isPartial?: boolean;
  }): Promise<void> {
    void this.conversationService
      .saveAssistantMessage(
        opts.conversationId,
        opts.reply,
        opts.activities,
        opts.isPartial ?? false,
      )
      .catch(() => {});
    if (opts.isNewConv)
      this.conversationService.triggerAutoTitle(
        opts.conversationId,
        opts.dto.message,
        opts.tenantId,
      );
    await this.quotaManager.incrementAndNotify(opts.subMeta?.id, opts.tenantId);
  }

  /**
   * Owns the full lifecycle of one copilot turn: conversation setup, LLM call
   * (with or without tools), persistence, and quota — for both the JSON and
   * SSE callers. Yields events as they happen; callers just adapt them to
   * their transport.
   */
  private async *runTurn(request: {
    user: AuthenticatedUser;
    dto: CopilotStreamMessage;
    subMeta: SubMeta;
    signal?: AbortSignal;
  }): AsyncGenerator<TurnEvent, void, void> {
    const { user, dto, subMeta, signal } = request;
    const {
      tenantId,
      isNewConv,
      useFunctionCalling,
      conversation,
      userMsg,
      history,
      financialContext,
    } = await this.setupService.prepare(user, dto);

    const persistAndDone = async (reply: string, activities: ActivityList): Promise<TurnEvent> => {
      await this.finalizeChat({
        conversationId: conversation.id,
        reply,
        activities,
        tenantId,
        subMeta,
        isNewConv,
        dto,
      });
      const meta = activities.length > 0 ? { activities } : undefined;
      return { type: 'done', reply, meta, conversationId: conversation.id };
    };

    const persistPartial = async (reply: string): Promise<TurnEvent> => {
      await this.finalizeChat({
        conversationId: conversation.id,
        reply,
        activities: [],
        tenantId,
        subMeta,
        isNewConv,
        dto,
        isPartial: true,
      });
      return { type: 'partial', reply };
    };

    const simpleChat = () =>
      this.chatProvider.chatCopilot(
        dto.message,
        history,
        financialContext,
        tenantId,
        conversation.id,
      );

    try {
      if (!useFunctionCalling) {
        const reply = await simpleChat();
        if (signal?.aborted) return;
        yield await persistAndDone(reply, []);
        return;
      }

      yield { type: 'activity', meta: COPILOT_INITIAL_STREAM_ACTIVITY };

      const resultsCapture = new Map<string, unknown>();
      const runner = this.agentFactory.createCopilotRunner(
        tenantId,
        dto.message,
        history,
        this.toolDepsProvider.getToolDeps(),
        resultsCapture,
        user.role,
      );

      if (!runner) {
        const reply = await simpleChat();
        if (signal?.aborted) return;
        yield await persistAndDone(reply, []);
        return;
      }

      yield* this.runWithTools(runner, resultsCapture, {
        tenantId,
        conversationId: conversation.id,
        signal,
        persistAndDone,
        persistPartial,
        fallback: simpleChat,
      });
    } catch (err) {
      await this.conversationService.deleteMessage(userMsg.id);
      throw err;
    }
  }

  private async *runWithTools(
    runner: CopilotAgentHarness,
    resultsCapture: Map<string, unknown>,
    ctx: {
      tenantId: string;
      conversationId: string;
      signal?: AbortSignal;
      persistAndDone: (reply: string, activities: ActivityList) => Promise<TurnEvent>;
      persistPartial: (reply: string) => Promise<TurnEvent>;
      fallback: () => Promise<string>;
    },
  ): AsyncGenerator<TurnEvent, void, void> {
    const queue = new TurnEventQueue();
    const calledTools: string[] = [];
    let accumulatedContent = '';
    let aborted = false;

    const onAbort = () => {
      aborted = true;
      runner.abort();
    };
    // The signal may already have fired by the time we get here (setup + delegation
    // through runTurn takes several microtask hops) — 'abort' is a one-shot event, so a
    // late addEventListener would silently miss it. Check the already-aborted state first.
    if (ctx.signal?.aborted) onAbort();
    else ctx.signal?.addEventListener('abort', onAbort);

    runner.on('functionToolCall', (call: { name: string }) => {
      calledTools.push(call.name);
      const meta = getStreamingActivityMeta(call.name);
      if (meta) queue.push({ type: 'activity', meta });
    });
    runner.on('content', (delta: string) => {
      if (delta) {
        accumulatedContent += delta;
        queue.push({ type: 'delta', content: delta });
      }
    });

    void (async () => {
      let fatalError: { err: unknown } | undefined;
      try {
        const rawReply = sanitizeCopilotOutput(
          (await runner.finalContent()) ?? '',
          'Xin lỗi, tôi không thể trả lời lúc này.',
        );
        if (aborted) return;

        const { name: usedAdapter, fallback: usedFallback } = await runner.usedAdapterInfo();
        const reply = usedFallback ? appendFallbackNotice(rawReply) : rawReply;
        if (usedFallback) {
          this.logger.warn(`Copilot trả lời qua fallback adapter: ${usedAdapter}`);
        }

        const usage = await runner.totalUsage();
        if (usage) {
          this.aiUsageLogService.record({
            tenantId: ctx.tenantId,
            callType: 'copilot',
            model:
              usedAdapter === 'minimax'
                ? this.openAiService.minimaxModel
                : this.openAiService.chatModel,
            tokensIn: usage.prompt_tokens,
            tokensOut: usage.completion_tokens,
            conversationId: ctx.conversationId,
          });
        }

        const activities = buildActivities(calledTools, resultsCapture);
        queue.push(await ctx.persistAndDone(reply, activities));
      } catch (err) {
        if (aborted) return;
        this.logger.warn(
          isQuotaOrBillingError(err)
            ? 'Copilot runTools hết quota/credit, chuyển simple chat (MiniMax) ngay'
            : 'Copilot stream runTools failed, falling back to simple chat',
          err instanceof Error ? err.message : String(err),
        );
        try {
          const reply = await ctx.fallback();
          queue.push(await ctx.persistAndDone(reply, []));
        } catch (fallbackErr) {
          fatalError = { err: fallbackErr };
        }
      } finally {
        if (aborted && accumulatedContent.trim()) {
          queue.push(await ctx.persistPartial(accumulatedContent));
        }
        ctx.signal?.removeEventListener('abort', onAbort);
        if (fatalError) queue.fail(fatalError.err);
        else queue.end();
      }
    })();

    for (;;) {
      const { value, done } = await queue.next();
      if (done) break;
      yield value;
    }
  }
}
