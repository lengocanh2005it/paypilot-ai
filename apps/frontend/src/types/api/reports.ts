export interface SummaryData {
  period: { year: number; month: number };
  summary: { totalRevenue: number; totalExpense: number; net: number };
  stats: { totalCount: number; classifiedCount: number; reviewCount: number; aiAccuracy: number };
}

export interface AccountRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  net: number;
  transactionCount: number;
}

export interface AccountBreakdownData {
  items: AccountRow[];
  page: number;
  limit: number;
  total: number;
}
