import { Role } from '@xcash/shared-types';

/** Admin hoặc Accountant — thao tác nghiệp vụ (review, reclassify, import). */
export function canManageTransactions(role?: Role | string | null): boolean {
  return role === Role.ADMIN || role === Role.ACCOUNTANT;
}

export function isAdmin(role?: Role | string | null): boolean {
  return role === Role.ADMIN;
}

/** Xem tab Billing + gọi GET /billing/*. */
export function canViewBilling(role?: Role | string | null): boolean {
  return role === Role.ADMIN || role === Role.ACCOUNTANT;
}

/** Xem tab Banking trong Settings. */
export function canViewBankingSettings(role?: Role | string | null): boolean {
  return role === Role.ADMIN || role === Role.ACCOUNTANT;
}

/** Xem tab Ngưỡng AI (chỉ Admin được sửa). */
export function canViewThreshold(role?: Role | string | null): boolean {
  return canManageTransactions(role);
}

export function canViewAuditLogs(role?: Role | string | null): boolean {
  return role === Role.ADMIN || role === Role.ACCOUNTANT;
}
