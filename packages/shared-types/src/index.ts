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
import type { SubscriptionPlan } from './generated/enums';

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

// ─── Re-export domain types ──────────────────────────────────────────────
export * from './copilot-types';
export * from './import-types';
export * from './notification-types';

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
