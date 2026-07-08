export interface ClassificationItem {
  id: string;
  debitAccount: string;
  creditAccount: string;
  confidenceScore: number;
  reason: string | null;
  transaction: {
    content: string | null;
    amount: string;
    transactionDate: string;
    grantId: string;
  };
}

export interface ReviewQueueResponse {
  data: {
    items: ClassificationItem[];
    total: number;
    page: number;
    limit: number;
  };
}
