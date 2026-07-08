export interface ComparisonData {
  current: { totalRevenue: number; totalExpense: number; net: number };
  previous: { totalRevenue: number; totalExpense: number; net: number };
  currentStats: {
    totalCount: number;
    classifiedCount: number;
    reviewCount: number;
    aiAccuracy: number;
  };
  previousStats: { aiAccuracy: number };
  changes: { revenue: number; expense: number; net: number; aiAccuracy: number };
}

export interface TopAccountsData {
  topExpense: Array<{ accountCode: string; accountName: string; total: number }>;
  topRevenue: Array<{ accountCode: string; accountName: string; total: number }>;
}
