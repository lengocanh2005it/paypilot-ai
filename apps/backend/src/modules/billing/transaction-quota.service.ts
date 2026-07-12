import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, SubscriptionPlan } from '@prisma/client';
import { isOveragePlan } from '../../common/constants/quota-policy';
import { QuotaNotificationService } from '../../common/services/quota-notification.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransactionQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaNotificationService: QuotaNotificationService,
  ) {}

  async getActiveSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active' },
    });
    return sub;
  }

  /**
   * Check if batch import is allowed. Free plan: throw when over quota.
   * Starter/Pro: allowed with overage. Enterprise: always allowed.
   * Returns the subscription for downstream use.
   */
  async assertCanAcceptBatch(
    tenantId: string,
    rowCount: number,
  ): Promise<{
    subscription: NonNullable<Awaited<ReturnType<typeof this.getActiveSubscription>>>;
    willExceedQuota: boolean;
    remaining: number;
  }> {
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new ForbiddenException('Không tìm thấy subscription active cho tenant');
    }

    const remaining = Math.max(
      0,
      subscription.transactionQuota - subscription.transactionUsedThisCycle,
    );
    const willExceedQuota = rowCount > remaining;

    if (willExceedQuota && subscription.plan === SubscriptionPlan.free) {
      throw new ForbiddenException(
        `Đã hết quota tháng này (còn ${remaining} slot). Vui lòng nâng cấp gói hoặc giảm số dòng import.`,
      );
    }

    return { subscription, willExceedQuota, remaining };
  }

  /**
   * Increment quota usage inside a Prisma transaction (tx).
   * Call this once per imported transaction row, inside prisma.$transaction.
   */
  async incrementUsageInTx(
    tx: Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    subscription: {
      id: string;
      transactionUsedThisCycle: number;
      transactionQuota: number;
      plan: SubscriptionPlan;
      overagePricePerTransaction: Prisma.Decimal | null;
      currentCycleStart: Date;
    },
    tenantId: string,
    count = 1,
  ): Promise<void> {
    const oldUsed = subscription.transactionUsedThisCycle;
    const quota = subscription.transactionQuota;

    await tx.subscription.update({
      where: { id: subscription.id },
      data: { transactionUsedThisCycle: { increment: count } },
    });

    if (isOveragePlan(subscription.plan)) {
      const overCount = Math.max(0, oldUsed + count - quota);
      if (overCount > 0) {
        await tx.usageLog.create({
          data: {
            tenantId,
            metric: 'overage_transaction',
            value: new Prisma.Decimal(overCount),
          },
        });
      }
    }
  }

  /**
   * Increment quota usage for a single transaction inside a Prisma transaction (tx).
   * Returns { overageLogged, oldUsed } so caller can fire notification with correct oldUsed.
   */
  async incrementUsage(
    tx: Omit<
      PrismaService,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    subscription: {
      id: string;
      transactionUsedThisCycle: number;
      transactionQuota: number;
      plan: SubscriptionPlan;
      overagePricePerTransaction: Prisma.Decimal | null;
      currentCycleStart: Date;
    },
    tenantId: string,
  ): Promise<{ oldUsed: number }> {
    const oldUsed = subscription.transactionUsedThisCycle;

    await tx.subscription.update({
      where: { id: subscription.id },
      data: { transactionUsedThisCycle: { increment: 1 } },
    });

    if (isOveragePlan(subscription.plan)) {
      const overCount = Math.max(0, oldUsed + 1 - subscription.transactionQuota);
      if (overCount > 0) {
        await tx.usageLog.create({
          data: {
            tenantId,
            metric: 'overage_transaction',
            value: new Prisma.Decimal(overCount),
          },
        });
      }
    }

    return { oldUsed };
  }

  /**
   * Fire quota notifications after a batch import.
   * Non-blocking: errors are logged but not thrown.
   */
  async notifyAfterBatch(
    subscription: {
      transactionUsedThisCycle: number;
      transactionQuota: number;
      plan: SubscriptionPlan;
      overagePricePerTransaction: Prisma.Decimal | null;
      currentCycleStart: Date;
    },
    tenantId: string,
    imported: number,
  ): Promise<void> {
    await this.quotaNotificationService.checkAndNotify({
      tenantId,
      oldUsed: subscription.transactionUsedThisCycle,
      quota: subscription.transactionQuota,
      plan: subscription.plan,
      overagePricePerTransaction: subscription.overagePricePerTransaction
        ? Number(subscription.overagePricePerTransaction)
        : null,
      cycleStart: subscription.currentCycleStart,
      added: imported,
    });
  }
}
