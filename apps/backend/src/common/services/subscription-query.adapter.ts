import { Injectable } from '@nestjs/common';
import type { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const CACHE_TTL_SECONDS = 60;

export interface ActiveSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: string;
  pricePerMonth: number;
  transactionQuota: number;
  transactionUsedThisCycle: number;
  copilotUsedThisCycle: number;
  currentCycleStart: Date;
  currentCycleEnd: Date;
}

export interface ActivePlanInfo {
  subscriptionId: string;
  plan: SubscriptionPlan;
}

/**
 * Single seam for "active subscription by tenant" queries.
 * Replaces the duplicated `prisma.subscription.findFirst({ where: { tenantId, status: 'active' } })`
 * pattern across guards, billing, settings, and auth modules.
 */
@Injectable()
export class SubscriptionQueryAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Fetch the full active subscription for a tenant.
   * Cached 60s in Redis. Returns null if no active subscription.
   */
  async findActive(tenantId: string): Promise<ActiveSubscription | null> {
    const cacheKey = `sub:active:${tenantId}`;
    try {
      const raw = await this.redis.client.get(cacheKey);
      if (raw) return JSON.parse(raw) as ActiveSubscription;
    } catch {
      // cache miss
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });

    if (!sub) return null;

    const dto: ActiveSubscription = {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      pricePerMonth: Number(sub.pricePerMonth),
      transactionQuota: sub.transactionQuota,
      transactionUsedThisCycle: sub.transactionUsedThisCycle,
      copilotUsedThisCycle: sub.copilotUsedThisCycle,
      currentCycleStart: sub.currentCycleStart,
      currentCycleEnd: sub.currentCycleEnd,
    };

    try {
      await this.redis.client.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(dto));
    } catch {
      // non-critical
    }

    return dto;
  }

  /**
   * Fetch only plan + subscriptionId for guards/settings/token checks.
   * Cached 60s in Redis. Returns null if no active subscription.
   */
  async findActivePlan(tenantId: string): Promise<ActivePlanInfo | null> {
    const cacheKey = `sub:plan:${tenantId}`;
    try {
      const raw = await this.redis.client.get(cacheKey);
      if (raw) return JSON.parse(raw) as ActivePlanInfo;
    } catch {
      // cache miss
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { startedAt: 'desc' },
      select: { id: true, plan: true },
    });

    if (!sub) return null;

    const dto: ActivePlanInfo = { subscriptionId: sub.id, plan: sub.plan };

    try {
      await this.redis.client.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(dto));
    } catch {
      // non-critical
    }

    return dto;
  }

  /**
   * Invalidate cached subscription data for a tenant.
   * Must be called after upgrade, partner plan change, or suspend/activate.
   */
  async invalidateCache(tenantId: string): Promise<void> {
    try {
      await this.redis.client.del(`sub:active:${tenantId}`, `sub:plan:${tenantId}`);
    } catch {
      // non-critical
    }
  }
}
