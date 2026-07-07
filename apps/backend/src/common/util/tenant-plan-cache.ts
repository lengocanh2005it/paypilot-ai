import type { SubscriptionPlan } from '@prisma/client';
import type { RedisService } from '../../redis/redis.service';

const TTL_SECONDS = 60;

export function tenantPlanCacheKey(tenantId: string): string {
  return `tenant:active-plan:${tenantId}`;
}

export async function getCachedTenantPlan(
  redis: RedisService,
  tenantId: string,
): Promise<SubscriptionPlan | null> {
  const cached = await redis.client.get(tenantPlanCacheKey(tenantId));
  if (!cached) {
    return null;
  }
  return cached as SubscriptionPlan;
}

export async function setCachedTenantPlan(
  redis: RedisService,
  tenantId: string,
  plan: SubscriptionPlan,
): Promise<void> {
  await redis.client.setex(tenantPlanCacheKey(tenantId), TTL_SECONDS, plan);
}

export async function invalidateTenantPlanCache(
  redis: RedisService,
  tenantId: string,
): Promise<void> {
  await redis.client.del(tenantPlanCacheKey(tenantId));
}
