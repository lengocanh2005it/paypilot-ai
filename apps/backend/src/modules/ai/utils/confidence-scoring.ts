export interface ConfidenceInput {
  semanticSimilarity: number;
  amountMatch: boolean;
  invoiceCodeMatch: boolean;
  dueDateOk: boolean;
  customerNameMatch: boolean;
}

/**
 * Tính Confidence Score 0–100 từ semantic similarity + rule validation.
 */
export function calculateConfidenceScore(input: ConfidenceInput): number {
  const semantic = Math.round(Math.max(0, Math.min(1, input.semanticSimilarity)) * 50);
  let score = semantic;

  if (input.invoiceCodeMatch) score += 25;
  if (input.amountMatch) score += 15;
  if (input.customerNameMatch) score += 5;
  if (input.dueDateOk) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function amountsMatch(transactionAmount: number, invoiceAmount: number): boolean {
  return Math.abs(transactionAmount - invoiceAmount) < 0.01;
}

export function isDueDateOk(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due >= today;
}
