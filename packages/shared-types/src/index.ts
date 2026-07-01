// Shared enums & types between @paypilot/backend and @paypilot/frontend.
// Source of truth: agent-docs/03-database-schema.md and agent-docs/04-rbac.md

export enum Role {
  CAS_PARTNER = 'cas_partner',
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  REVIEW = 'review',
  SKIPPED = 'skipped',
}

export enum InvoiceStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERPAID = 'overpaid',
}

export enum MatchType {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum CasGrantStatus {
  ACTIVE = 'active',
  INVALIDATED = 'invalidated',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum PaymentOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  FAILED = 'failed',
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
