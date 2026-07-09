import { describe, expect, it } from 'vitest';
import { formatCopilotDisplayText } from './format-copilot-text';

describe('formatCopilotDisplayText', () => {
  it('converts markdown headings to bold', () => {
    const input = '### 1. Kiểm tra Casso\n\nNội dung';
    expect(formatCopilotDisplayText(input)).toBe('**1. Kiểm tra Casso**\n\nNội dung');
  });

  it('removes horizontal rules', () => {
    const input = 'Đoạn 1\n---\nĐoạn 2';
    expect(formatCopilotDisplayText(input)).toBe('Đoạn 1\n\nĐoạn 2');
  });

  it('keeps bold and bullets unchanged', () => {
    const input = '**Tiêu đề**\n- Mục 1';
    expect(formatCopilotDisplayText(input)).toBe(input);
  });
});
