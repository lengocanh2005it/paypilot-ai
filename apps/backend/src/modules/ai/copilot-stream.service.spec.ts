import { EventEmitter } from 'node:events';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@xcash/shared-types';
import { CopilotQuotaManager } from '../../common/services/copilot-quota-manager';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { AiUsageLogService } from './ai-usage-log.service';
import { ChatProviderService } from './chat-provider.service';
import { CopilotAgentFactoryService } from './copilot-agent-factory.service';
import { CopilotConversationService } from './copilot-conversation.service';
import { CopilotConversationSetupService } from './copilot-conversation-setup.service';
import { CopilotStreamService } from './copilot-stream.service';
import { CopilotToolDepsProvider } from './copilot-tool-deps.provider';
import { OpenAiService } from './openai.service';

/** Minimal fake mirroring the CopilotAgentHarness surface used by CopilotStreamService. */
function createFakeRunner(opts: {
  finalContent?: string;
  usedAdapter?: string;
  fallback?: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
}) {
  const emitter = new EventEmitter() as EventEmitter & {
    finalContent: jest.Mock;
    usedAdapterInfo: jest.Mock;
    totalUsage: jest.Mock;
    abort: jest.Mock;
  };
  emitter.finalContent = jest.fn().mockResolvedValue(opts.finalContent ?? 'Xin chào');
  emitter.usedAdapterInfo = jest.fn().mockResolvedValue({
    name: opts.usedAdapter ?? 'openai',
    fallback: opts.fallback ?? false,
  });
  emitter.totalUsage = jest
    .fn()
    .mockResolvedValue(opts.usage ?? { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
  emitter.abort = jest.fn();
  return emitter;
}

describe('CopilotStreamService', () => {
  let service: CopilotStreamService;
  let chatProvider: { chatCopilot: jest.Mock };
  let agentFactory: { createCopilotRunner: jest.Mock };
  let conversationService: {
    saveAssistantMessage: jest.Mock;
    triggerAutoTitle: jest.Mock;
    deleteMessage: jest.Mock;
  };
  let setupService: { prepare: jest.Mock };
  let quotaManager: { incrementAndNotify: jest.Mock };
  let aiUsageLogService: { record: jest.Mock };
  let toolDepsProvider: { getToolDeps: jest.Mock };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    role: Role.ADMIN,
    tenantId: 'tenant-1',
    businessName: 'Test Corp',
    plan: 'starter',
  };

  const dto = { message: 'Doanh thu tháng này?', history: [] };
  const subMeta = { id: 'sub-1', copilotQuota: 100 };

  const basePreparedState = {
    tenantId: 'tenant-1',
    isNewConv: false,
    useFunctionCalling: true,
    conversation: { id: 'conv-1', tenantId: 'tenant-1', userId: 'user-1' },
    userMsg: { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: dto.message },
    history: [],
    financialContext: 'Tháng 7/2026: ...',
  };

  beforeEach(async () => {
    chatProvider = { chatCopilot: jest.fn().mockResolvedValue('fallback reply') };
    agentFactory = { createCopilotRunner: jest.fn() };
    conversationService = {
      saveAssistantMessage: jest.fn().mockResolvedValue(undefined),
      triggerAutoTitle: jest.fn(),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    };
    setupService = { prepare: jest.fn().mockResolvedValue(basePreparedState) };
    quotaManager = { incrementAndNotify: jest.fn().mockResolvedValue(undefined) };
    aiUsageLogService = { record: jest.fn() };
    toolDepsProvider = { getToolDeps: jest.fn().mockReturnValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotStreamService,
        {
          provide: OpenAiService,
          useValue: { chatModel: 'gpt-4o-mini', minimaxModel: 'MiniMax-M3' },
        },
        { provide: ChatProviderService, useValue: chatProvider },
        { provide: CopilotAgentFactoryService, useValue: agentFactory },
        { provide: CopilotConversationService, useValue: conversationService },
        { provide: CopilotConversationSetupService, useValue: setupService },
        { provide: CopilotQuotaManager, useValue: quotaManager },
        { provide: AiUsageLogService, useValue: aiUsageLogService },
        { provide: CopilotToolDepsProvider, useValue: toolDepsProvider },
      ],
    }).compile();

    service = module.get<CopilotStreamService>(CopilotStreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat()', () => {
    it('uses the tool-calling runner when useFunctionCalling is true and persists the reply', async () => {
      const runner = createFakeRunner({ finalContent: 'Doanh thu tháng này là 100 triệu' });
      agentFactory.createCopilotRunner.mockReturnValue(runner);

      const result = await service.chat(mockUser, dto, subMeta);

      expect(toolDepsProvider.getToolDeps).toHaveBeenCalled();
      expect(result.reply).toBe('Doanh thu tháng này là 100 triệu');
      expect(result.conversationId).toBe('conv-1');
      expect(conversationService.saveAssistantMessage).toHaveBeenCalledWith(
        'conv-1',
        'Doanh thu tháng này là 100 triệu',
        [],
        false,
      );
      expect(quotaManager.incrementAndNotify).toHaveBeenCalledWith('sub-1', 'tenant-1');
    });

    it('falls back to chatProvider.chatCopilot when no runner is available (no LLM adapters)', async () => {
      agentFactory.createCopilotRunner.mockReturnValue(null);

      const result = await service.chat(mockUser, dto, subMeta);

      expect(chatProvider.chatCopilot).toHaveBeenCalledWith(
        dto.message,
        [],
        'Tháng 7/2026: ...',
        'tenant-1',
        'conv-1',
      );
      expect(result.reply).toBe('fallback reply');
    });

    it('calls chatProvider.chatCopilot directly when useFunctionCalling is false', async () => {
      setupService.prepare.mockResolvedValue({ ...basePreparedState, useFunctionCalling: false });

      const result = await service.chat(mockUser, dto, subMeta);

      expect(agentFactory.createCopilotRunner).not.toHaveBeenCalled();
      expect(chatProvider.chatCopilot).toHaveBeenCalled();
      expect(result.reply).toBe('fallback reply');
    });

    it('deletes the just-saved user message and rethrows when the AI call fails', async () => {
      agentFactory.createCopilotRunner.mockImplementation(() => {
        throw new Error('boom');
      });

      await expect(service.chat(mockUser, dto, subMeta)).rejects.toThrow('boom');
      expect(conversationService.deleteMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('streamChat()', () => {
    function createFakeRes() {
      const writes: string[] = [];
      return {
        setHeader: jest.fn(),
        write: jest.fn((chunk: string) => writes.push(chunk)),
        flushHeaders: jest.fn(),
        writableEnded: false,
        end: jest.fn(),
        __writes: writes,
      } as unknown as import('express').Response & { __writes: string[] };
    }

    it('streams deltas and writes a done event with the final reply', async () => {
      const runner = createFakeRunner({ finalContent: 'Xin chào bạn' });
      agentFactory.createCopilotRunner.mockReturnValue(runner);
      const res = createFakeRes();
      const closeCallbacks: Array<() => void> = [];

      const streamPromise = service.streamChat(mockUser, dto, subMeta, res, (cb) =>
        closeCallbacks.push(cb),
      );

      // Let the runTurn()/runWithTools() generator chain unwind past its microtask hops
      // (activity yield -> runner creation -> listener registration) before emitting —
      // mirrors how a real 'content' event arrives on a later event-loop tick, not the
      // same microtask queue.next() is first awaited on.
      setImmediate(() => runner.emit('content', 'Xin chào'));

      await streamPromise;

      const doneFrame = res.__writes.find((w) => w.includes('event: done'));
      expect(doneFrame).toContain('"reply":"Xin chào bạn"');
      expect(conversationService.saveAssistantMessage).toHaveBeenCalledWith(
        'conv-1',
        'Xin chào bạn',
        [],
        false,
      );
      expect(quotaManager.incrementAndNotify).toHaveBeenCalledWith('sub-1', 'tenant-1');
    });

    it('aborts the runner and saves a partial message when the request closes early', async () => {
      const runner = createFakeRunner({ finalContent: 'never reaches here' });
      // finalContent only resolves once abort() has been called — mirrors the real harness,
      // which settles its run promise (with whatever content accumulated) on abort().
      // abort() may fire before finalContent() is ever invoked (the runner isn't created
      // until after the first yielded 'activity' event), so the resolver must be wired up
      // eagerly rather than inside finalContent()'s own call.
      let resolveFinal: (value: string) => void;
      const finalContentPromise = new Promise<string>((resolve) => {
        resolveFinal = resolve;
      });
      runner.finalContent = jest.fn().mockReturnValue(finalContentPromise);
      runner.abort.mockImplementation(() => resolveFinal(''));
      agentFactory.createCopilotRunner.mockReturnValue(runner);
      const res = createFakeRes();
      let triggerClose: (() => void) | undefined;

      const streamPromise = service.streamChat(mockUser, dto, subMeta, res, (cb) => {
        triggerClose = cb;
      });

      setImmediate(() => {
        runner.emit('content', 'Đang xử lý');
        triggerClose?.();
      });

      await streamPromise;

      expect(runner.abort).toHaveBeenCalled();
      expect(conversationService.saveAssistantMessage).toHaveBeenCalledWith(
        'conv-1',
        'Đang xử lý',
        [],
        true,
      );
      // finalizeChat() always increments quota, even for the partial-save-on-abort path —
      // characterizing current behavior, not necessarily desired behavior.
      expect(quotaManager.incrementAndNotify).toHaveBeenCalledWith('sub-1', 'tenant-1');
      const doneFrame = res.__writes.find((w) => w.includes('event: done'));
      expect(doneFrame).toBeUndefined();
    });

    it('falls back to chatProvider.chatCopilot when useFunctionCalling is false', async () => {
      setupService.prepare.mockResolvedValue({ ...basePreparedState, useFunctionCalling: false });
      const res = createFakeRes();

      await service.streamChat(mockUser, dto, subMeta, res, () => {});

      expect(agentFactory.createCopilotRunner).not.toHaveBeenCalled();
      const doneFrame = res.__writes.find((w) => w.includes('event: done'));
      expect(doneFrame).toContain('"reply":"fallback reply"');
    });
  });
});
