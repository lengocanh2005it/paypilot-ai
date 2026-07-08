import { SubscriptionPlan } from '@prisma/client';

/** Plans that incur overage charges when exceeding quota (Free blocked, Enterprise unlimited). */
export const OVERAGE_PLANS = [SubscriptionPlan.starter, SubscriptionPlan.pro] as const;

/** When usage reaches this ratio of quota, send a warning notification. */
export const QUOTA_WARNING_RATIO = 0.8;

export function isOveragePlan(plan: string): boolean {
  return (OVERAGE_PLANS as readonly string[]).includes(plan);
}
