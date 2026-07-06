import { Injectable, StreamableFile } from '@nestjs/common';
import { TransactionDirection, TransactionSource, TransactionStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccountBreakdownQueryDto } from './dto/account-breakdown.dto';
import { buildExportWorkbook } from './report-excel.util';

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

export interface AccountSummary {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  net: number;
  transactionCount: number;
}

@Injectable()
export class ReportService {
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

  private isClassifiedRevenue(tx: {
    amount: unknown;
    source: TransactionSource;
    direction: TransactionDirection | null;
  }) {
    if (tx.source === TransactionSource.import) {
      return tx.direction === TransactionDirection.in;
    }
    return Number(tx.amount) > 0;
  }

  private isClassifiedExpense(tx: {
    amount: unknown;
    source: TransactionSource;
    direction: TransactionDirection | null;
  }) {
    if (tx.source === TransactionSource.import) {
      return tx.direction === TransactionDirection.out;
    }
    return Number(tx.amount) < 0;
  }

  private flowAmount(tx: { amount: unknown }) {
    return Math.abs(Number(tx.amount)) || 0;
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
    const dateRange = { gte: from, lte: to };

    const [classifiedTransactions, activityTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { tenantId, status: TransactionStatus.classified, transactionDate: dateRange },
        select: {
          transactionDate: true,
          amount: true,
          source: true,
          direction: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: { tenantId, transactionDate: dateRange },
        select: { transactionDate: true },
      }),
    ]);

    for (const transaction of classifiedTransactions) {
      const dayKey = this.formatDayKey(transaction.transactionDate);
      const bucket = bucketByDay.get(dayKey);
      if (!bucket) {
        continue;
      }

      bucket.classifiedCount += 1;
      const value = this.flowAmount(transaction);
      if (this.isClassifiedRevenue(transaction)) {
        bucket.revenueAmount += value;
      } else if (this.isClassifiedExpense(transaction)) {
        bucket.expenseAmount += value;
      }
      bucket.count = bucket.classifiedCount;
      bucket.amount = bucket.revenueAmount;
    }

    for (const transaction of activityTransactions) {
      const dayKey = this.formatDayKey(transaction.transactionDate);
      const bucket = bucketByDay.get(dayKey);
      if (bucket) {
        bucket.activityCount += 1;
      }
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

  private async buildAccountSummaries(
    tenantId: string,
    from: Date,
    to: Date,
    inclusiveEnd = false,
  ): Promise<AccountSummary[]> {
    const classifications = await this.prisma.transactionClassification.findMany({
      where: {
        tenantId,
        status: TransactionStatus.classified,
        transaction: {
          transactionDate: inclusiveEnd ? { gte: from, lte: to } : { gte: from, lt: to },
        },
      },
      select: { debitAccount: true, creditAccount: true, amount: true },
    });

    const accountMap = new Map<string, AccountSummary>();

    for (const c of classifications) {
      const amount = Number(c.amount);
      this.updateAccount(accountMap, c.debitAccount, amount, 0);
      this.updateAccount(accountMap, c.creditAccount, 0, amount);
    }

    const codes = [...accountMap.keys()];
    if (codes.length > 0) {
      const accounts = await this.prisma.chartOfAccount.findMany({
        where: { tenantId, accountCode: { in: codes } },
        select: { accountCode: true, accountName: true, accountType: true },
      });
      for (const a of accounts) {
        const entry = accountMap.get(a.accountCode);
        if (entry) {
          entry.accountName = a.accountName;
          entry.accountType = a.accountType;
        }
      }
    }

    return [...accountMap.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  async getSummary(tenantId: string, year: number, month: number) {
    const { from, to } = this.periodBounds(year, month);

    const [byAccount, reviewCount, totalCount, classifiedCount] = await Promise.all([
      this.buildAccountSummaries(tenantId, from, to),
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

  async getAccountBreakdown(
    tenantId: string,
    year: number,
    month: number,
    query: AccountBreakdownQueryDto,
  ) {
    const { from, to } = this.periodBounds(year, month);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim().toLowerCase();
    const accountType =
      query.accountType && query.accountType !== 'all' ? query.accountType : undefined;

    let items = await this.buildAccountSummaries(tenantId, from, to);

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
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      page,
      limit,
      total,
    };
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

  async exportExcel(tenantId: string, fromDate: string, toDate: string): Promise<StreamableFile> {
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
        this.buildAccountSummaries(tenantId, from, to, true),
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

    const wb = buildExportWorkbook({
      businessName: tenant.businessName,
      fromDate,
      toDate,
      exportedAt: new Date(),
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
    });

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="bao-cao-dinh-khoan-${fromDate}-${toDate}.xlsx"`,
    });
  }

  async getComparison(tenantId: string, year: number, month: number) {
    const [current, previous] = await Promise.all([
      this.getSummary(tenantId, year, month),
      this.getSummary(tenantId, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
    ]);

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      // Chia cho |prev| thay vì prev để tránh lật dấu khi baseline âm (vd lãi/lỗ
      // chuyển từ lỗ sang lãi) — dùng prev trực tiếp cho ra % ngược hướng cải thiện thực tế.
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

    const classifications = await this.prisma.transactionClassification.findMany({
      where: {
        tenantId,
        status: TransactionStatus.classified,
        transaction: { transactionDate: { gte: from, lt: to } },
      },
      select: { debitAccount: true, creditAccount: true, amount: true },
    });

    const expenseMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();

    for (const c of classifications) {
      const amt = Number(c.amount);
      expenseMap.set(c.debitAccount, (expenseMap.get(c.debitAccount) ?? 0) + amt);
      revenueMap.set(c.creditAccount, (revenueMap.get(c.creditAccount) ?? 0) + amt);
    }

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

  private updateAccount(
    map: Map<string, AccountSummary>,
    code: string,
    debit: number,
    credit: number,
  ): void {
    const existing = map.get(code);
    if (existing) {
      existing.totalDebit += debit;
      existing.totalCredit += credit;
      existing.net = existing.totalCredit - existing.totalDebit;
      existing.transactionCount += 1;
    } else {
      map.set(code, {
        accountCode: code,
        accountName: code,
        accountType: 'unknown',
        totalDebit: debit,
        totalCredit: credit,
        net: credit - debit,
        transactionCount: 1,
      });
    }
  }
}
