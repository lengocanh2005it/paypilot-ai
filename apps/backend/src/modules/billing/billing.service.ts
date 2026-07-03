import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PayosService } from './payos.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payosService: PayosService,
    private readonly config: ConfigService,
  ) {}

  async listPlans() {
    const plans = await this.prisma.planPricing.findMany({ orderBy: { pricePerMonth: 'asc' } });
    return plans.map((p) => ({
      plan: p.plan,
      pricePerMonth: Number(p.pricePerMonth),
      transactionQuota: p.transactionQuota,
      overagePricePerTransaction:
        p.overagePricePerTransaction !== null ? Number(p.overagePricePerTransaction) : null,
    }));
  }

  private async getPlanPricingOrThrow(plan: SubscriptionPlan) {
    const pricing = await this.prisma.planPricing.findUnique({ where: { plan } });
    if (!pricing) {
      throw new NotFoundException(`Không tìm thấy cấu hình gói ${plan}`);
    }
    return pricing;
  }

  async getCurrentPlan(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('Không tìm thấy gói dịch vụ');

    return {
      plan: sub.plan,
      pricePerMonth: Number(sub.pricePerMonth),
      transactionQuota: sub.transactionQuota,
      transactionUsed: sub.transactionUsedThisCycle,
      currentCycleStart: sub.currentCycleStart,
      currentCycleEnd: sub.currentCycleEnd,
      status: sub.status,
    };
  }

  async getUsageHistory(tenantId: string) {
    const logs = await this.prisma.usageLog.findMany({
      where: { tenantId },
      orderBy: { recordedAt: 'desc' },
      take: 90,
    });
    return logs.map((l) => ({
      metric: l.metric,
      value: Number(l.value),
      recordedAt: l.recordedAt,
    }));
  }

  async upgrade(tenantId: string, targetPlan: SubscriptionPlan) {
    const currentSub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    });

    if (currentSub?.plan === targetPlan) {
      throw new BadRequestException('Doanh nghiệp đang sử dụng gói này');
    }

    if (currentSub) {
      const currentPricing = await this.getPlanPricingOrThrow(currentSub.plan);
      const targetPricing = await this.getPlanPricingOrThrow(targetPlan);
      if (Number(targetPricing.pricePerMonth) < Number(currentPricing.pricePerMonth)) {
        throw new BadRequestException('Không thể hạ xuống gói thấp hơn gói hiện tại');
      }
    }

    const pricing = await this.getPlanPricingOrThrow(targetPlan);
    const amount = Number(pricing.pricePerMonth);

    if (amount <= 0 && targetPlan !== 'free') {
      throw new BadRequestException('Gói dịch vụ không hợp lệ');
    }

    // orderCode phải là số nguyên dương, tránh vượt quá giới hạn PayOS
    const orderCode = Number(String(Date.now()).slice(-9));
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    const order = await this.prisma.paymentOrder.create({
      data: {
        tenantId,
        orderCode: String(orderCode),
        targetPlan,
        amount,
        status: 'pending',
      },
    });

    const link = await this.payosService.createPaymentLink({
      orderCode,
      amount,
      description: `X-Cash AI nang cap ${targetPlan}`,
      returnUrl: `${frontendUrl}/settings?tab=billing&status=success`,
      cancelUrl: `${frontendUrl}/settings?tab=billing&status=cancel`,
    });

    return {
      orderCode: order.orderCode,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      amount,
      isMock: link.isMock,
    };
  }

  async confirmPayment(orderCode: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { orderCode } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn thanh toán');

    // Idempotency — đã xử lý rồi thì bỏ qua
    if (order.status === 'paid') return { success: true, alreadyPaid: true };

    const { tenantId, targetPlan } = order;
    const pricing = await this.getPlanPricingOrThrow(targetPlan);
    const amount = Number(order.amount);
    const quota = pricing.transactionQuota;
    const now = new Date();
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await this.prisma.$transaction([
      this.prisma.paymentOrder.update({
        where: { orderCode },
        data: { status: 'paid', paidAt: now },
      }),
      this.prisma.subscription.updateMany({
        where: { tenantId, status: 'active' },
        data: { status: 'cancelled' },
      }),
      this.prisma.subscription.create({
        data: {
          tenantId,
          plan: targetPlan,
          pricePerMonth: amount,
          transactionQuota: quota,
          transactionUsedThisCycle: 0,
          status: 'active',
          startedAt: now,
          currentCycleStart: now,
          currentCycleEnd: cycleEnd,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          entityType: 'subscription',
          entityId: orderCode,
          action: 'subscription_upgraded',
          actor: 'system',
          afterState: { plan: targetPlan, amount, orderCode },
        },
      }),
    ]);

    return { success: true, alreadyPaid: false };
  }
}
