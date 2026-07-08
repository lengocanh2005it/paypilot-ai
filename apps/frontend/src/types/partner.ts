export interface PartnerTenant {
  id: string;
  businessName: string;
  createdAt: string;
  plan: string | null;
  status: string;
  transactionsThisMonth: number;
  revenuePerMonth: number;
}

export interface PartnerTenantsResponse {
  items: PartnerTenant[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface PlanPricingItem {
  plan: string;
  pricePerMonth: number;
  transactionQuota: number;
}

export interface TenantDetail {
  id: string;
  businessName: string;
  ownerName: string | null;
  createdAt: string;
  classificationThreshold: number;
  plan: string | null;
  status: string;
  pricePerMonth: number;
  transactionQuota: number;
  transactionUsedThisCycle: number;
  transactionsThisMonth: number;
  totalTransactions: number;
  aiAccuracy: number;
  members: TenantMember[];
}

export interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  aiAccuracy: number;
}

export interface PartnerPayment {
  id: string;
  orderCode: string;
  tenantId: string;
  businessName: string;
  orderType: string;
  targetPlan: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentsResponse {
  items: PartnerPayment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: { totalCount: number; paidCount: number; totalPaid: number };
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  transactionsThisMonth: number;
  /** Tổng giá gói/tháng của DN đang hoạt động (MRR). */
  recurringRevenuePerMonth: number;
  /** Tiền nâng cấp gói PayOS xác nhận trong tháng hiện tại. */
  paidRevenueThisMonth: number;
  aiAccuracy: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  free: number;
  starter: number;
  pro: number;
  enterprise: number;
}

export interface AiCostBreakdownItem {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  callCount: number;
}

export interface AiCostRow {
  tenantId: string;
  tenantName: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  breakdown: Record<string, AiCostBreakdownItem>;
}

export interface AiCostsResponse {
  items: AiCostRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  grandTotalCostUsd: number;
  grandTotalCalls: number;
  grandTotalTokensIn: number;
  grandTotalTokensOut: number;
  tenantCount: number;
  callTypeSummary: Record<string, AiCostBreakdownItem>;
}

export interface AiCostDetailLog {
  id: string;
  callType: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  transactionId: string | null;
  conversationId: string | null;
  createdAt: string;
}

export interface AiCostDetailResponse {
  items: AiCostDetailLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
