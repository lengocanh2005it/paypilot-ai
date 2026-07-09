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
import { SubscriptionQueryAdapter } from '../services/subscription-query.adapter';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export const COPILOT_SUBSCRIPTION_KEY = '__copilotSubscription';

const PLAN_PRICING_CACHE_TTL = 30;

@Injectable()
export class CopilotQuotaGuard implements CanActivate {
  constructor(
    private readonly subscriptionQuery: SubscriptionQueryAdapter,
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

    const sub = await this.subscriptionQuery.findActive(user.tenantId);
    if (!sub) return true;

    // Fetch copilotQuota from planPricing (separate cache — quota rarely changes)
    let copilotQuota: number;
    const pricingCacheKey = `copilot:pricing:${sub.plan}`;
    try {
      const cached = await this.redis.client.get(pricingCacheKey);
      if (cached) {
        copilotQuota = Number(cached);
      } else {
        const pricing = await this.prisma.planPricing.findUnique({
          where: { plan: sub.plan },
          select: { copilotQuota: true },
        });
        copilotQuota = pricing?.copilotQuota ?? -1;
        await this.redis.client.setex(
          pricingCacheKey,
          PLAN_PRICING_CACHE_TTL,
          String(copilotQuota),
        );
      }
    } catch {
      copilotQuota = -1;
    }

    if (copilotQuota === -1) {
      request[COPILOT_SUBSCRIPTION_KEY] = { id: sub.id };
      return true;
    }

    if (sub.copilotUsedThisCycle >= copilotQuota) {
      throw new HttpException(
        `Bạn đã dùng hết ${copilotQuota} lượt chat Copilot trong tháng này. Nâng cấp gói để tiếp tục.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request[COPILOT_SUBSCRIPTION_KEY] = { id: sub.id };
    return true;
  }
}
