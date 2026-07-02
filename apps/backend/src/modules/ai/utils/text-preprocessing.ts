/**
 * Chuẩn hóa nội dung chuyển khoản tiếng Việt trước khi embedding / rule matching.
 */
export function preprocessTransactionContent(content: string): string {
  return content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractInvoiceCodeTokens(content: string): string[] {
  const normalized = preprocessTransactionContent(content);
  const matches = normalized.match(/\b(hd|dh|don|invoice)\s*([a-z0-9]+)\b/gi) ?? [];
  const codes: string[] = [];

  for (const match of matches) {
    const parts = match.split(/\s+/);
    if (parts.length >= 2) {
      codes.push(parts.slice(1).join('').toUpperCase());
    }
  }

  const bareCodes = normalized.match(/\b(hd|dh)\d+\b/gi) ?? [];
  for (const code of bareCodes) {
    codes.push(code.replace(/\s/g, '').toUpperCase());
  }

  return [...new Set(codes)];
}

export function extractPhoneNumbers(content: string): string[] {
  const matches = content.match(/(?:\+84|0)\d{8,10}/g) ?? [];
  return [...new Set(matches.map((p) => p.replace(/^\+84/, '0')))];
}

export function namesMatch(content: string, customerName: string): boolean {
  const normalizedContent = preprocessTransactionContent(content);
  const normalizedName = preprocessTransactionContent(customerName);
  if (!normalizedName) return false;

  const nameParts = normalizedName.split(' ').filter((p) => p.length > 1);
  if (nameParts.length === 0) return false;

  const matchedParts = nameParts.filter((part) => normalizedContent.includes(part));
  return matchedParts.length >= Math.min(2, nameParts.length);
}
