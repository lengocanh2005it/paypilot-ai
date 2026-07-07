import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export const COPILOT_SUBSCRIPTION_KEY = '__copilotSubscription';

const CACHE_TTL_SECONDS = 30;

interface CachedQuota {
  subscriptionId: string;
  copilotUsedThisCycle: number;
  copilotQuota: number;
}

@Injectable()
export class CopilotQuotaGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user: AuthenticatedUser;
        [COPILOT_SUBSCRIPTION_KEY]?: { id: string };
      }
    >();

    const user = request.user;
    if (!user?.tenantId) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }

    const cacheKey = `copilot:quota:${user.tenantId}`;
    let cached: CachedQuota | null = null;

    try {
      const raw = await this.redis.client.get(cacheKey);
      if (raw) cached = JSON.parse(raw) as CachedQuota;
    } catch {
      // cache miss — proceed to DB
    }

    let subscriptionId: string;
    let copilotUsedThisCycle: number;
    let copilotQuota: number;

    if (cached) {
      subscriptionId = cached.subscriptionId;
      copilotUsedThisCycle = cached.copilotUsedThisCycle;
      copilotQuota = cached.copilotQuota;
    } else {
      const subscription = await this.prisma.subscription.findFirst({
        where: { tenantId: user.tenantId, status: 'active' },
        orderBy: { startedAt: 'desc' },
        select: { id: true, plan: true, copilotUsedThisCycle: true },
      });

      if (!subscription) return true;

      const planPricing = await this.prisma.planPricing.findUnique({
        where: { plan: subscription.plan },
        select: { copilotQuota: true },
      });

      subscriptionId = subscription.id;
      copilotUsedThisCycle = subscription.copilotUsedThisCycle;
      copilotQuota = planPricing?.copilotQuota ?? -1;

      try {
        await this.redis.client.setex(
          cacheKey,
          CACHE_TTL_SECONDS,
          JSON.stringify({ subscriptionId, copilotUsedThisCycle, copilotQuota }),
        );
      } catch {
        // non-critical — ignore cache write errors
      }
    }

    if (copilotQuota === -1) {
      request[COPILOT_SUBSCRIPTION_KEY] = { id: subscriptionId };
      return true;
    }

    if (copilotUsedThisCycle >= copilotQuota) {
      throw new HttpException(
        `Bạn đã dùng hết ${copilotQuota} lượt chat Copilot trong tháng này. Nâng cấp gói để tiếp tục.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request[COPILOT_SUBSCRIPTION_KEY] = { id: subscriptionId };
    return true;
  }
}
