import { Injectable } from '@nestjs/common';
import type { PaymentOrderStatus, SubscriptionPlan } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStatsPeriod, resolveTrendMonths } from './utils/date.util';

@Injectable()
export class RevenueAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(params?: { fromDate?: string; toDate?: string }) {
    const period = resolveStatsPeriod(params?.fromDate, params?.toDate);

    const [totalTenants, subscriptions, transactionsThisMonth, classifications] = await Promise.all(
      [
        this.prisma.tenant.count(),
        this.prisma.subscription.findMany({
          orderBy: { startedAt: 'desc' },
          distinct: ['tenantId'],
        }),
        this.prisma.transaction.count({
          where: { createdAt: { gte: period.start, lte: period.end } },
        }),
        this.prisma.transactionClassification.findMany({
          where: { createdAt: { gte: period.start, lte: period.end } },
          select: { classificationType: true },
        }),
      ],
    );

    const suspendedCount = subscriptions.filter((s) => s.status === 'suspended').length;
    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
    const recurringRevenuePerMonth = activeSubscriptions.reduce(
      (sum, s) => sum + Number(s.pricePerMonth),
      0,
    );

    const paidOrdersAgg = await this.prisma.paymentOrder.aggregate({
      where: {
        status: 'paid',
        paidAt: { gte: period.start, lte: period.end },
      },
      _sum: { amount: true },
    });
    const paidRevenueThisMonth = Number(paidOrdersAgg._sum.amount ?? 0);

    const autoClassified = classifications.filter((c) => c.classificationType === 'auto').length;
    const aiAccuracy =
      classifications.length > 0 ? Math.round((autoClassified / classifications.length) * 100) : 0;

    return {
      totalTenants,
      activeTenants: totalTenants - suspendedCount,
      suspendedTenants: suspendedCount,
      transactionsThisMonth,
      recurringRevenuePerMonth,
      paidRevenueThisMonth,
      aiAccuracy,
    };
  }

  async getRevenueTrend(params?: { fromDate?: string; toDate?: string }) {
    const months = resolveTrendMonths(params?.fromDate, params?.toDate);
    if (months.length === 0) return [];

    const paidOrders = await this.prisma.paymentOrder.findMany({
      where: { status: 'paid', paidAt: { gte: months[0].start, lte: months.at(-1)!.end } },
      select: { amount: true, paidAt: true, targetPlan: true },
    });

    return months.map(({ start, end, label }) => {
      const inMonth = paidOrders.filter((o) => o.paidAt && o.paidAt >= start && o.paidAt <= end);
      const byPlan = { free: 0, starter: 0, pro: 0, enterprise: 0 };
      let revenue = 0;
      for (const o of inMonth) {
        const amount = Number(o.amount);
        revenue += amount;
        if (o.targetPlan in byPlan) {
          byPlan[o.targetPlan as keyof typeof byPlan] += amount;
        }
      }
      return { month: label, revenue, ...byPlan };
    });
  }

  async listPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.trunc(params.limit ?? 20)));

    const where: Prisma.PaymentOrderWhereInput = {};
    if (params.status && params.status !== 'all') {
      where.status = params.status as PaymentOrderStatus;
    }
    if (params.plan && params.plan !== 'all') {
      where.targetPlan = params.plan as SubscriptionPlan;
    }

    const createdAt: Prisma.DateTimeFilter = {};
    if (params.fromDate) {
      const from = new Date(params.fromDate);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (params.toDate) {
      const to = new Date(params.toDate);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const search = params.search?.trim();
    if (search) {
      const matchingTenants = await this.prisma.tenant.findMany({
        where: { businessName: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      });
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { tenantId: { in: matchingTenants.map((t) => t.id) } },
      ];
    }

    const [total, orders, summaryAll, summaryPaid] = await Promise.all([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.aggregate({
        where: { AND: [where, { status: 'paid' }] },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const tenantIds = [...new Set(orders.map((o) => o.tenantId))];
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, businessName: true },
    });
    const nameByTenant = new Map(tenants.map((t) => [t.id, t.businessName]));

    return {
      items: orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        tenantId: o.tenantId,
        businessName: nameByTenant.get(o.tenantId) ?? '—',
        orderType: o.orderType,
        targetPlan: o.targetPlan,
        amount: Number(o.amount),
        status: o.status,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        totalCount: summaryAll,
        paidCount: summaryPaid._count._all,
        totalPaid: Number(summaryPaid._sum.amount ?? 0),
      },
    };
  }
}
