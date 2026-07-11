import type { ConfigService } from '@nestjs/config';
import { COPILOT_TOOLS } from './copilot-tool.registry';
import type { LlmTool } from './llm-adapter.interface';

/**
 * Chỉ build JSON schema của tool để gửi lên LLM — không gắn executor.
 * Việc thực thi tool do CopilotAgentHarness gọi thẳng CopilotToolService.execute().
 */
export function buildCopilotToolSchemas(configService?: ConfigService): LlmTool[] {
  return COPILOT_TOOLS.filter((entry) => {
    if (!entry.enabledBy) return true;
    return configService?.get<boolean>(entry.enabledBy) ?? false;
  }).map((entry) => ({
    type: 'function' as const,
    function: {
      name: entry.name,
      description: entry.description,
      strict: true,
      parameters: entry.parameters as Record<string, unknown>,
    },
  }));
}
