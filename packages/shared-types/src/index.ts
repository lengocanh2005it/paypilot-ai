// Shared enums & types between @xcash/backend and @xcash/frontend.

// ─── Re-export enums from generated file (source of truth: Prisma schema) ─
export {
  AccountType,
  AiCallType,
  CasGrantStatus,
  ClassificationType,
  CopilotMessageRole,
  NotificationType,
  PaymentOrderStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionDirection,
  TransactionSource,
  TransactionStatus,
} from './generated/enums';

// ─── Plan utilities ──────────────────────────────────────────────────────
import type {
  NotificationType,
  Role,
  SubscriptionPlan,
  TransactionDirection,
  TransactionSource,
  TransactionStatus,
} from './generated/enums';

/** Thứ bậc gói dịch vụ — dùng để so sánh quyền truy cập tính năng theo tier. */
export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

/** True nếu gói hiện tại đủ cao (>=) so với gói tối thiểu yêu cầu. */
export function meetsPlan(
  current: SubscriptionPlan | null | undefined,
  required: SubscriptionPlan,
): boolean {
  if (!current) return false;
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

// ─── Interfaces ──────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: AppNotification[];
  unreadCount: number;
  total: number;
}

export interface ImportValidateResult {
  valid: boolean;
  totalRows: number;
  errorCount?: number;
  errors?: Array<{
    row: number;
    column?: string;
    value?: string;
    message: string;
  }>;
  warnings?: Array<{ row: number; message: string }>;
  quotaImpact?: {
    willUse: number;
    remaining: number;
    willExceedQuota: boolean;
  };
  preview?: Array<{
    row: number;
    date: string;
    description: string;
    amount: number;
    direction: TransactionDirection;
  }>;
}

export interface ImportResult {
  batchId: string;
  imported: number;
  skipped: number;
  skippedReasons?: Array<{ row: number; reason: string }>;
  quotaWarning?: string;
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  importedByName: string;
  createdAt: string;
}

export interface CopilotConfirmActionCardData {
  tool: 'propose_confirm_transaction_classification';
  transactionId: string;
  classificationId: string;
  debitAccount: string;
  creditAccount: string;
  confidence: number;
  status: string;
  content: string;
  amount: number;
  canConfirm: boolean;
  reason?: string;
}

export interface CopilotCorrectActionCardData {
  tool: 'propose_correct_transaction_classification';
  transactionId: string;
  classificationId: string;
  debitAccount: string;
  creditAccount: string;
  proposedDebitAccount: string;
  proposedCreditAccount: string;
  confidence: number;
  status: string;
  content: string;
  amount: number;
  canCorrect: boolean;
  reason?: string;
}

export type CopilotActionCardData = CopilotConfirmActionCardData | CopilotCorrectActionCardData;

export interface CopilotActivity {
  kind: 'internal_data' | 'knowledge' | 'web_search' | 'action_card';
  label: string;
  source?: string;
  urls?: string[];
  snippet?: string;
  actionCard?: CopilotActionCardData;
}

export interface CopilotConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface CopilotMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  activities?: CopilotActivity[];
  createdAt: string;
  isPartial: boolean;
}

export interface CopilotConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: CopilotMessageDto[];
  hasMore: boolean;
  oldestMessageId: string | null;
}

export interface CopilotConversationsListResponse {
  items: CopilotConversationSummary[];
  hasMore: boolean;
  cursorNext: string | null;
  /** Offset pagination (Settings history tab) */
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta?: {
    timestamp: string;
    request_id: string;
    page?: number;
    limit?: number;
    total?: number;
  };
  error: { code: string; message: string } | null;
}

// ─── Auth / Profile ──────────────────────────────────────────────────────
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  tenantId: string | null;
  businessName: string | null;
  plan: SubscriptionPlan | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  tenantId: string | null;
  businessName: string | null;
  ownerName: string | null;
  plan: SubscriptionPlan | null;
}

export interface UpdateProfileInput {
  name?: string;
  businessName?: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────
export interface TransactionClassificationSummary {
  debitAccount: string;
  creditAccount: string;
  confidenceScore: number;
  classificationType: string;
  status: string;
  reason: string | null;
}

export interface TransactionSummary {
  id: string;
  transactionId: string;
  amount: string;
  content: string | null;
  senderAccount: string | null;
  status: TransactionStatus | string;
  confidenceScore: number | null;
  transactionDate: string;
  source?: TransactionSource;
  direction?: TransactionDirection;
  classification?: TransactionClassificationSummary | null;
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
  totalPages?: number;
}

// ─── Classification / Review ──────────────────────────────────────────────
export interface ClassificationItem {
  id: string;
  debitAccount: string;
  creditAccount: string;
  confidenceScore: number;
  reason: string | null;
  transaction: {
    id: string;
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

// ─── Onboarding ────────────────────────────────────────────────────────────
export interface OnboardingGrant {
  id: string;
  grantId: string;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankLogo: string | null;
  linkedAt: string;
  status: string;
}

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
}

export interface OnboardingStatus {
  currentStep: number;
  bankingLinked: boolean;
  grants: OnboardingGrant[];
  steps: OnboardingStep[];
}

export interface GrantTokenResponse {
  grantToken: string;
  expiresAt: string | null;
  redirectUri: string;
  linkBaseUrl: string;
}

export interface BankingCallbackResponse {
  grantId: string;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankLogo: string | null;
  linkedAt: string;
}

// ─── Billing ────────────────────────────────────────────────────────────────
export interface PlanData {
  plan: string;
  pricePerMonth: number;
  transactionQuota: number;
  transactionUsed: number;
  currentCycleStart: string;
  currentCycleEnd: string;
  status: string;
  copilotQuota: number;
  copilotUsed: number;
  usageBreakdown?: { fromBank: number; fromImport: number };
}

export interface UpgradeResult {
  orderCode: string;
  checkoutUrl: string;
  qrCode: string;
  amount: number;
  isMock: boolean;
}

export interface OverageOrder {
  orderCode: string;
  amount: number;
  createdAt: string;
}

export interface OveragePaymentResult {
  orderCode: string;
  amount: number;
  overageCount: number;
  checkoutUrl: string | null;
  qrCode: string | null;
  isMock: boolean;
  isExisting: boolean;
}

export interface BillingPlan {
  plan: string;
  pricePerMonth: number;
  transactionQuota: number;
  copilotQuota?: number;
  overagePricePerTransaction: number | null;
}

export interface PaymentOrder {
  id: string;
  orderCode: string;
  orderType: 'upgrade' | 'overage';
  targetPlan: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentHistoryResponse {
  data: PaymentOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CycleTransaction {
  id: string;
  transactionId: string;
  amount: number;
  content: string;
  transactionDate: string;
  createdAt: string;
  senderAccount: string | null;
  source: TransactionSource;
  classification: {
    debitAccount: string | null;
    creditAccount: string | null;
    status: string;
  } | null;
}

// ─── Reports / Analytics ──────────────────────────────────────────────────
export interface SummaryData {
  period: { year: number; month: number };
  summary: { totalRevenue: number; totalExpense: number; net: number };
  stats: {
    totalCount: number;
    classifiedCount: number;
    reviewCount: number;
    aiAccuracy: number;
  };
}

export interface AccountSummary {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  net: number;
  transactionCount: number;
}

export interface AccountBreakdownData {
  items: AccountSummary[];
  page: number;
  limit: number;
  total: number;
}

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

// ─── Partner ────────────────────────────────────────────────────────────────
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
  currentCycleStart?: string;
  currentCycleEnd?: string;
  transactionsThisMonth: number;
  totalTransactions: number;
  aiAccuracy: number;
  members: TenantMember[];
}

export interface PlanPricingItem {
  plan: string;
  pricePerMonth: number;
  transactionQuota: number;
  copilotQuota?: number;
  overagePricePerTransaction: number | null;
  editable?: boolean;
  updatedAt?: string;
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  transactionsThisMonth: number;
  recurringRevenuePerMonth: number;
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
