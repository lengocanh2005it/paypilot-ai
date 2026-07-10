import { Injectable } from '@nestjs/common';
import { TransactionDirection, TransactionSource, TransactionStatus } from '@prisma/client';
import { paginateParams, paginateResult } from '../../common/util/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccountSummary,
  buildAccountSummaries,
  fetchClassificationSides,
} from './report-account-summary';

interface DailyTrendSqlRow {
  day_key: string;
  activity_count: bigint;
  classified_count: bigint;
  revenue_amount: unknown;
  expense_amount: unknown;
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  /** @deprecated use classifiedCount */
  count: number;
  /** @deprecated use revenueAmount */
  amount: number;
  activityCount: number;
  classifiedCount: number;
  revenueAmount: number;
  expenseAmount: number;
}

export interface StatusBreakdownItem {
  status: TransactionStatus;
  count: number;
}

export interface SourceBreakdownItem {
  source: TransactionSource;
  count: number;
}

@Injectable()
export class ReportDataService {
  constructor(private readonly prisma: PrismaService) {}

  private periodBounds(year: number, month: number) {
    return {
      from: new Date(year, month - 1, 1),
      to: new Date(year, month, 1),
    };
  }

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private formatDayKey(date: Date) {
    const day = this.startOfDay(date);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  }

  private formatDayLabel(dayKey: string) {
    const [, month, day] = dayKey.split('-');
    return `${day}/${month}`;
  }

  private buildDailyTrendBuckets(days: number): DailyTrendPoint[] {
    const today = this.startOfDay(new Date());
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      const dayKey = this.formatDayKey(date);
      return {
        date: dayKey,
        label: this.formatDayLabel(dayKey),
        count: 0,
        amount: 0,
        activityCount: 0,
        classifiedCount: 0,
        revenueAmount: 0,
        expenseAmount: 0,
      };
    });
  }

  async getDailyTrend(tenantId: string, days = 7) {
    const clampedDays = Math.min(31, Math.max(1, days));
    const buckets = this.buildDailyTrendBuckets(clampedDays);
    const from = buckets[0]?.date
      ? new Date(`${buckets[0].date}T00:00:00`)
      : this.startOfDay(new Date());
    const to = this.startOfDay(new Date());
    to.setHours(23, 59, 59, 999);

    const bucketByDay = new Map(buckets.map((bucket) => [bucket.date, bucket]));

    const rows = await this.prisma.$queryRaw<DailyTrendSqlRow[]>`
      SELECT
        to_char(date_trunc('day', t.transaction_date), 'YYYY-MM-DD') AS day_key,
        COUNT(*)::bigint AS activity_count,
        COUNT(*) FILTER (WHERE t.status::text = ${TransactionStatus.classified})::bigint AS classified_count,
        COALESCE(SUM(
          CASE WHEN t.status::text = ${TransactionStatus.classified} AND (
            (t.source::text = ${TransactionSource.import} AND t.direction::text = ${TransactionDirection.in})
            OR (t.source::text <> ${TransactionSource.import} AND t.amount > 0)
          ) THEN ABS(t.amount) ELSE 0 END
        ), 0) AS revenue_amount,
        COALESCE(SUM(
          CASE WHEN t.status::text = ${TransactionStatus.classified} AND (
            (t.source::text = ${TransactionSource.import} AND t.direction::text = ${TransactionDirection.out})
            OR (t.source::text <> ${TransactionSource.import} AND t.amount < 0)
          ) THEN ABS(t.amount) ELSE 0 END
        ), 0) AS expense_amount
      FROM transactions t
      WHERE t.tenant_id = ${tenantId}
        AND t.transaction_date >= ${from}
        AND t.transaction_date <= ${to}
      GROUP BY 1
      ORDER BY 1
    `;

    for (const row of rows) {
      const bucket = bucketByDay.get(row.day_key);
      if (!bucket) {
        continue;
      }

      const classifiedCount = Number(row.classified_count);
      const revenueAmount = Number(row.revenue_amount);
      const expenseAmount = Number(row.expense_amount);

      bucket.activityCount = Number(row.activity_count);
      bucket.classifiedCount = classifiedCount;
      bucket.revenueAmount = revenueAmount;
      bucket.expenseAmount = expenseAmount;
      bucket.count = classifiedCount;
      bucket.amount = revenueAmount;
    }

    return {
      days: clampedDays,
      from: buckets[0]?.date ?? this.formatDayKey(from),
      to: buckets.at(-1)?.date ?? this.formatDayKey(to),
      points: buckets,
    };
  }

  async getStatusBreakdown(tenantId: string) {
    const groups = await this.prisma.transaction.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });

    const items: StatusBreakdownItem[] = groups.map((group) => ({
      status: group.status,
      count: group._count._all,
    }));

    const total = items.reduce((sum, item) => sum + item.count, 0);

    return { items, total };
  }

  async getSourceBreakdown(tenantId: string) {
    const groups = await this.prisma.transaction.groupBy({
      by: ['source'],
      where: { tenantId },
      _count: { _all: true },
    });

    const items: SourceBreakdownItem[] = groups.map((group) => ({
      source: group.source,
      count: group._count._all,
    }));

    const total = items.reduce((sum, item) => sum + item.count, 0);

    return { items, total };
  }

  async getSummary(tenantId: string, year: number, month: number) {
    const { from, to } = this.periodBounds(year, month);

    const [byAccount, reviewCount, totalCount, classifiedCount] = await Promise.all([
      buildAccountSummaries(this.prisma, tenantId, from, to),
      this.prisma.transactionClassification.count({
        where: {
          tenantId,
          status: TransactionStatus.review,
          transaction: { transactionDate: { gte: from, lt: to } },
        },
      }),
      this.prisma.transaction.count({
        where: { tenantId, transactionDate: { gte: from, lt: to } },
      }),
      this.prisma.transactionClassification.count({
        where: {
          tenantId,
          status: TransactionStatus.classified,
          transaction: { transactionDate: { gte: from, lt: to } },
        },
      }),
    ]);

    const totalRevenue = byAccount
      .filter((a) => a.accountType === 'revenue')
      .reduce((s, a) => s + a.totalCredit - a.totalDebit, 0);

    const totalExpense = byAccount
      .filter((a) => a.accountType === 'expense')
      .reduce((s, a) => s + a.totalDebit - a.totalCredit, 0);

    const aiAccuracy = totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0;

    return {
      period: { year, month },
      summary: { totalRevenue, totalExpense, net: totalRevenue - totalExpense },
      stats: { totalCount, classifiedCount, reviewCount, aiAccuracy },
    };
  }

  async getSummaryByDateRange(tenantId: string, startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);

    const [byAccount, reviewCount, totalCount, classifiedCount] = await Promise.all([
      buildAccountSummaries(this.prisma, tenantId, from, to),
      this.prisma.transactionClassification.count({
        where: {
          tenantId,
          status: TransactionStatus.review,
          transaction: { transactionDate: { gte: from, lte: to } },
        },
      }),
      this.prisma.transaction.count({
        where: { tenantId, transactionDate: { gte: from, lte: to } },
      }),
      this.prisma.transactionClassification.count({
        where: {
          tenantId,
          status: TransactionStatus.classified,
          transaction: { transactionDate: { gte: from, lte: to } },
        },
      }),
    ]);

    const totalRevenue = byAccount
      .filter((a) => a.accountType === 'revenue')
      .reduce((s, a) => s + a.totalCredit - a.totalDebit, 0);

    const totalExpense = byAccount
      .filter((a) => a.accountType === 'expense')
      .reduce((s, a) => s + a.totalDebit - a.totalCredit, 0);

    const aiAccuracy = totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0;

    return {
      period: { startDate, endDate },
      summary: { totalRevenue, totalExpense, net: totalRevenue - totalExpense },
      stats: { totalCount, classifiedCount, reviewCount, aiAccuracy },
    };
  }

  async getAccountBreakdown(
    tenantId: string,
    year: number,
    month: number,
    filters: { page?: number; limit?: number; search?: string; accountType?: string },
  ) {
    const { from, to } = this.periodBounds(year, month);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const search = filters.search?.trim().toLowerCase();
    const accountType =
      filters.accountType && filters.accountType !== 'all' ? filters.accountType : undefined;

    let items = await buildAccountSummaries(this.prisma, tenantId, from, to);

    if (search) {
      items = items.filter(
        (a) =>
          a.accountCode.toLowerCase().includes(search) ||
          a.accountName.toLowerCase().includes(search),
      );
    }

    if (accountType) {
      items = items.filter((a) => a.accountType === accountType);
    }

    const total = items.length;
    const { skip: start } = paginateParams(page, limit);

    return paginateResult(items.slice(start, start + limit), total, page, limit);
  }

  async getByAccount(tenantId: string, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const classifications = await this.prisma.transactionClassification.findMany({
      where: {
        tenantId,
        status: TransactionStatus.classified,
        transaction: { transactionDate: { gte: from, lte: to } },
      },
      include: {
        transaction: { select: { transactionDate: true, content: true, amount: true } },
      },
      orderBy: { transaction: { transactionDate: 'asc' } },
    });

    return classifications.map((c) => ({
      id: c.id,
      date: c.transaction.transactionDate,
      content: c.transaction.content,
      debitAccount: c.debitAccount,
      creditAccount: c.creditAccount,
      amount: Number(c.amount),
      reason: c.reason,
      classificationType: c.classificationType,
    }));
  }

  async fetchExportData(tenantId: string, fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const [tenant, classifications, byAccount, reviewCount, totalCount, classifiedCount] =
      await Promise.all([
        this.prisma.tenant.findUniqueOrThrow({
          where: { id: tenantId },
          select: { businessName: true },
        }),
        this.prisma.transactionClassification.findMany({
          where: {
            tenantId,
            status: TransactionStatus.classified,
            transaction: { transactionDate: { gte: from, lte: to } },
          },
          include: {
            transaction: { select: { transactionDate: true, content: true, amount: true } },
          },
          orderBy: { transaction: { transactionDate: 'asc' } },
        }),
        buildAccountSummaries(this.prisma, tenantId, from, to, true),
        this.prisma.transactionClassification.count({
          where: {
            tenantId,
            status: TransactionStatus.review,
            transaction: { transactionDate: { gte: from, lte: to } },
          },
        }),
        this.prisma.transaction.count({
          where: { tenantId, transactionDate: { gte: from, lte: to } },
        }),
        this.prisma.transactionClassification.count({
          where: {
            tenantId,
            status: TransactionStatus.classified,
            transaction: { transactionDate: { gte: from, lte: to } },
          },
        }),
      ]);

    const totalRevenue = byAccount
      .filter((a) => a.accountType === 'revenue')
      .reduce((s, a) => s + a.totalCredit - a.totalDebit, 0);

    const totalExpense = byAccount
      .filter((a) => a.accountType === 'expense')
      .reduce((s, a) => s + a.totalDebit - a.totalCredit, 0);

    const aiAccuracy = totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0;

    return {
      businessName: tenant.businessName,
      fromDate,
      toDate,
      summary: {
        totalRevenue,
        totalExpense,
        net: totalRevenue - totalExpense,
        classifiedCount,
        reviewCount,
        totalCount,
        aiAccuracy,
      },
      accounts: byAccount,
      details: classifications.map((c) => ({
        transactionDate: c.transaction.transactionDate,
        content: c.transaction.content ?? '',
        amount: Number(c.amount),
        debitAccount: c.debitAccount,
        creditAccount: c.creditAccount,
        classificationType: c.classificationType,
        reason: c.reason,
      })),
    };
  }

  async getComparison(tenantId: string, year: number, month: number) {
    const [current, previous] = await Promise.all([
      this.getSummary(tenantId, year, month),
      this.getSummary(tenantId, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
    ]);

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / Math.abs(prev)) * 100);
    };

    return {
      current: current.summary,
      previous: previous.summary,
      currentStats: current.stats,
      previousStats: previous.stats,
      changes: {
        revenue: pctChange(current.summary.totalRevenue, previous.summary.totalRevenue),
        expense: pctChange(current.summary.totalExpense, previous.summary.totalExpense),
        net: pctChange(current.summary.net, previous.summary.net),
        aiAccuracy: pctChange(current.stats.aiAccuracy, previous.stats.aiAccuracy),
      },
    };
  }

  async getTopAccounts(tenantId: string, year: number, month: number, limit: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const { debits, credits } = await fetchClassificationSides(
      this.prisma,
      tenantId,
      from,
      to,
      false,
    );

    const expenseMap = new Map(debits.map((row) => [row.account_code, Number(row.total)]));
    const revenueMap = new Map(credits.map((row) => [row.account_code, Number(row.total)]));

    const codes = [...new Set([...expenseMap.keys(), ...revenueMap.keys()])];
    const accounts =
      codes.length > 0
        ? await this.prisma.chartOfAccount.findMany({
            where: { tenantId, accountCode: { in: codes } },
            select: { accountCode: true, accountName: true, accountType: true },
          })
        : [];

    const accountInfo = new Map(accounts.map((a) => [a.accountCode, a]));

    const topExpense = [...expenseMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([code, total]) => ({
        accountCode: code,
        accountName: accountInfo.get(code)?.accountName ?? code,
        accountType: accountInfo.get(code)?.accountType ?? 'unknown',
        total,
      }));

    const topRevenue = [...revenueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([code, total]) => ({
        accountCode: code,
        accountName: accountInfo.get(code)?.accountName ?? code,
        accountType: accountInfo.get(code)?.accountType ?? 'unknown',
        total,
      }));

    return { topExpense, topRevenue };
  }
}
