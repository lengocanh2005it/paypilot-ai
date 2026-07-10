import { EventEmitter } from 'node:events';
import type { LlmAdapter, LlmMessage, LlmTool, LlmUsage } from './llm-adapter.interface';
import { shouldFallbackProvider } from './utils/llm-error.util';
import { ToolCallAccumulator } from './utils/tool-call-accumulator.util';

export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;

function mergeUsage(a: LlmUsage | undefined, b: LlmUsage | undefined): LlmUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    prompt_tokens: a.prompt_tokens + b.prompt_tokens,
    completion_tokens: a.completion_tokens + b.completion_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
  };
}

/**
 * Harness cố định: agent loop (gọi LLM → tool_calls → thực thi → lặp lại) +
 * fallback giữa các adapter khi lỗi thuộc nhóm nên chuyển provider.
 * Không biết gì về provider cụ thể — chỉ phụ thuộc LlmAdapter interface.
 */
export class CopilotAgentHarness extends EventEmitter {
  private aborted = false;
  private usage: LlmUsage | undefined;
  private readonly runPromise: Promise<string>;

  constructor(
    private readonly adapters: LlmAdapter[],
    systemPrompt: string,
    history: LlmMessage[],
    userMessage: string,
    private readonly tools: LlmTool[],
    private readonly executeTool: ToolExecutor,
    private readonly maxIterations = 5,
  ) {
    super();
    if (adapters.length === 0) {
      throw new Error('CopilotAgentHarness cần ít nhất 1 LlmAdapter');
    }
    const initialMessages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];
    this.runPromise = this.run(initialMessages);
  }

  abort(): void {
    this.aborted = true;
  }

  async finalContent(): Promise<string> {
    return this.runPromise;
  }

  async totalUsage(): Promise<LlmUsage | undefined> {
    await this.runPromise.catch(() => undefined);
    return this.usage;
  }

  private async run(messages: LlmMessage[]): Promise<string> {
    let lastError: unknown;
    for (const adapter of this.adapters) {
      try {
        return await this.runWithAdapter(adapter, messages);
      } catch (err) {
        lastError = err;
        if (!shouldFallbackProvider(err)) throw err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Tất cả LLM adapter đều lỗi');
  }

  private async runWithAdapter(adapter: LlmAdapter, messages: LlmMessage[]): Promise<string> {
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      if (this.aborted) return '';

      const acc = new ToolCallAccumulator();
      for await (const chunk of adapter.streamChatCompletion(messages, this.tools)) {
        if (this.aborted) return '';
        acc.push(chunk);
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) this.emit('content', delta);
      }

      const result = acc.result();
      this.usage = mergeUsage(this.usage, result.usage);

      if (result.toolCalls.length === 0) {
        return result.content;
      }

      messages.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls,
      });

      for (const call of result.toolCalls) {
        this.emit('functionToolCall', { name: call.function.name });
        let output: unknown;
        try {
          const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
          output = await this.executeTool(call.function.name, args);
        } catch (err) {
          output = { error: err instanceof Error ? err.message : String(err) };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(output),
        });
      }
    }

    // Chạm giới hạn vòng lặp mà chưa có câu trả lời cuối — trả rỗng,
    // caller (sanitizeCopilotOutput) sẽ dùng câu fallback lịch sự.
    return '';
  }
}
