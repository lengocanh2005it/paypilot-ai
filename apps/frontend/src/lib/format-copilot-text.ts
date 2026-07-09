/** Copilot UI chỉ render **bold** — chuẩn hóa markdown thừa từ LLM trước khi hiển thị. */
export function formatCopilotDisplayText(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '**$1**')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
