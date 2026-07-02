import type { TransactionStatus } from '@paypilot/shared-types';

export interface TransactionSummary {
  id: string;
  transactionId: string;
  amount: string;
  content: string | null;
  senderAccount: string | null;
  status: TransactionStatus | string;
  confidenceScore: number | null;
  transactionDate: string;
}

export interface TransactionDetail extends TransactionSummary {
  grantId: string | null;
  receiverAccount: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  items: TransactionSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface MatchCandidate {
  invoiceId: string;
  invoiceCode: string;
  customerId: string;
  customerName: string;
  amount: number;
  confidenceScore: number;
  semanticSimilarity: number;
}

export interface TransactionMatchesResponse {
  candidates: MatchCandidate[];
}
