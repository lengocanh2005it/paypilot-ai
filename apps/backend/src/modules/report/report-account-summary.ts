import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface AccountSideSqlRow {
  account_code: string;
  total: unknown;
  tx_count: bigint;
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

export async function fetchClassificationSides(
  prisma: PrismaService,
  tenantId: string,
  from: Date,
  to: Date,
  inclusiveEnd = false,
): Promise<{ debits: AccountSideSqlRow[]; credits: AccountSideSqlRow[] }> {
  const dateEnd = inclusiveEnd
    ? Prisma.sql`t.transaction_date <= ${to}`
    : Prisma.sql`t.transaction_date < ${to}`;

  const [debits, credits] = await Promise.all([
    prisma.$queryRaw<AccountSideSqlRow[]>`
      SELECT
        tc.debit_account AS account_code,
        COALESCE(SUM(tc.amount::numeric), 0) AS total,
        COUNT(*)::bigint AS tx_count
      FROM transaction_classifications tc
      INNER JOIN transactions t ON t.id = tc.transaction_id
      WHERE tc.tenant_id = ${tenantId}
        AND tc.status::text = ${TransactionStatus.classified}
        AND t.transaction_date >= ${from}
        AND ${dateEnd}
      GROUP BY tc.debit_account
    `,
    prisma.$queryRaw<AccountSideSqlRow[]>`
      SELECT
        tc.credit_account AS account_code,
        COALESCE(SUM(tc.amount::numeric), 0) AS total,
        COUNT(*)::bigint AS tx_count
      FROM transaction_classifications tc
      INNER JOIN transactions t ON t.id = tc.transaction_id
      WHERE tc.tenant_id = ${tenantId}
        AND tc.status::text = ${TransactionStatus.classified}
        AND t.transaction_date >= ${from}
        AND ${dateEnd}
      GROUP BY tc.credit_account
    `,
  ]);

  return { debits, credits };
}

export function mergeAccountSideAggregates(
  map: Map<string, AccountSummary>,
  rows: AccountSideSqlRow[],
  side: 'debit' | 'credit',
): void {
  for (const row of rows) {
    const amount = Number(row.total);
    const count = Number(row.tx_count);
    const existing = map.get(row.account_code);
    if (existing) {
      if (side === 'debit') {
        existing.totalDebit += amount;
      } else {
        existing.totalCredit += amount;
      }
      existing.transactionCount += count;
      existing.net = existing.totalCredit - existing.totalDebit;
      continue;
    }

    map.set(row.account_code, {
      accountCode: row.account_code,
      accountName: row.account_code,
      accountType: 'unknown',
      totalDebit: side === 'debit' ? amount : 0,
      totalCredit: side === 'credit' ? amount : 0,
      net: (side === 'credit' ? amount : 0) - (side === 'debit' ? amount : 0),
      transactionCount: count,
    });
  }
}

export async function buildAccountSummaries(
  prisma: PrismaService,
  tenantId: string,
  from: Date,
  to: Date,
  inclusiveEnd = false,
): Promise<AccountSummary[]> {
  const { debits, credits } = await fetchClassificationSides(
    prisma,
    tenantId,
    from,
    to,
    inclusiveEnd,
  );

  const accountMap = new Map<string, AccountSummary>();
  mergeAccountSideAggregates(accountMap, debits, 'debit');
  mergeAccountSideAggregates(accountMap, credits, 'credit');

  const codes = [...accountMap.keys()];
  if (codes.length > 0) {
    const accounts = await prisma.chartOfAccount.findMany({
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
