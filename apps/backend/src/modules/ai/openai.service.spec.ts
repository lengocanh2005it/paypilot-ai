import type { ConfigService } from '@nestjs/config';
import type { AiUsageLogService } from './ai-usage-log.service';
import { OpenAiService } from './openai.service';

function buildService(): OpenAiService {
  const configService = {
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
  } as unknown as ConfigService;
  const aiUsageLogService = {} as AiUsageLogService;
  return new OpenAiService(configService, aiUsageLogService);
}

describe('OpenAiService.buildCopilotSystemPrompt', () => {
  it('places the current month/year line at the very end of the prompt to maximize the static cacheable prefix', () => {
    const service = buildService();
    const prompt = service.buildCopilotSystemPrompt(false);
    const trimmed = prompt.trimEnd();
    const now = new Date();
    const expectedLastLine = `- "tháng này" / "hiện tại" → tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

    expect(trimmed.endsWith(expectedLastLine)).toBe(true);

    const securityIndex = prompt.indexOf('## Bảo mật');
    const dateLineIndex = prompt.indexOf(expectedLastLine);
    expect(securityIndex).toBeGreaterThan(-1);
    expect(dateLineIndex).toBeGreaterThan(securityIndex);
  });

  it('keeps all other static content unchanged regardless of cassoSearchEnabled', () => {
    const service = buildService();
    const prompt = service.buildCopilotSystemPrompt(true);
    expect(prompt).toContain('search_casso_public');
    expect(prompt).toContain('## Quy tắc gọi tool');
    expect(prompt).toContain('## Bảo mật');
  });
});
