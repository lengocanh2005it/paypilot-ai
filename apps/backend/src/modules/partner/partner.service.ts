import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscriptions: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const monthStart = this.getMonthStart();
    const transactionCounts = await this.prisma.transaction.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
    });
    const countsByTenant = new Map(transactionCounts.map((c) => [c.tenantId, c._count._all]));

    return tenants.map((tenant) => {
      const subscription = tenant.subscriptions[0];
      return {
        id: tenant.id,
        businessName: tenant.businessName,
        createdAt: tenant.createdAt,
        plan: subscription?.plan ?? null,
        status: subscription?.status ?? 'active',
        transactionsThisMonth: countsByTenant.get(tenant.id) ?? 0,
        revenuePerMonth: subscription ? Number(subscription.pricePerMonth) : 0,
      };
    });
  }

  async suspendTenant(tenantId: string) {
    const subscription = await this.getLatestSubscription(tenantId);
    if (subscription.status === 'suspended') {
      throw new BadRequestException('Doanh nghiệp đã bị khóa');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'suspended' },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'tenant',
        entityId: tenantId,
        action: 'tenant_suspended',
        actor: 'cas_partner',
      },
    });

    return { success: true };
  }

  async activateTenant(tenantId: string) {
    const subscription = await this.getLatestSubscription(tenantId);
    if (subscription.status === 'active') {
      throw new BadRequestException('Doanh nghiệp đang hoạt động');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'active' },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'tenant',
        entityId: tenantId,
        action: 'tenant_activated',
        actor: 'cas_partner',
      },
    });

    return { success: true };
  }

  async getStats() {
    const monthStart = this.getMonthStart();

    const [totalTenants, subscriptions, transactionsThisMonth, classifications] = await Promise.all(
      [
        this.prisma.tenant.count(),
        this.prisma.subscription.findMany({
          orderBy: { startedAt: 'desc' },
          distinct: ['tenantId'],
        }),
        this.prisma.transaction.count({ where: { createdAt: { gte: monthStart } } }),
        this.prisma.transactionClassification.findMany({
          where: { createdAt: { gte: monthStart } },
          select: { classificationType: true },
        }),
      ],
    );

    const suspendedCount = subscriptions.filter((s) => s.status === 'suspended').length;
    const revenueThisMonth = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + Number(s.pricePerMonth), 0);

    const autoClassified = classifications.filter((c) => c.classificationType === 'auto').length;
    const aiAccuracy =
      classifications.length > 0 ? Math.round((autoClassified / classifications.length) * 100) : 0;

    return {
      totalTenants,
      activeTenants: totalTenants - suspendedCount,
      suspendedTenants: suspendedCount,
      transactionsThisMonth,
      revenueThisMonth,
      aiAccuracy,
    };
  }

  async getRevenueTrend() {
    const months = Array.from({ length: 6 }, (_, i) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return { start, end, label: `${start.getMonth() + 1}/${start.getFullYear()}` };
    });

    const paidOrders = await this.prisma.paymentOrder.findMany({
      where: { status: 'paid', paidAt: { gte: months[0].start } },
      select: { amount: true, paidAt: true },
    });

    return months.map(({ start, end, label }) => {
      const revenue = paidOrders
        .filter((o) => o.paidAt && o.paidAt >= start && o.paidAt < end)
        .reduce((sum, o) => sum + Number(o.amount), 0);
      return { month: label, revenue };
    });
  }

  private async getLatestSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
    });
    if (!subscription) throw new NotFoundException('Không tìm thấy doanh nghiệp');
    return subscription;
  }

  private getMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
