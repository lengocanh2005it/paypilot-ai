import { TransactionStatus } from '@xcash/shared-types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SignedTransactionAmount } from '@/components/shared/SignedTransactionAmount';
import { TransactionSourceBadge } from '@/components/shared/TransactionSourceBadge';
import { TransactionStatusBadge } from '@/components/shared/TransactionStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTransactionTime } from '@/lib/dashboard-transactions';
import type { TransactionSummary } from '@/types/transaction';

interface RecentTransactionsCardProps {
  items: TransactionSummary[];
  isLoading?: boolean;
}

export function RecentTransactionsCard({ items, isLoading }: RecentTransactionsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
          <CardDescription>Cập nhật mỗi 10 giây</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/transactions">
            Xem tất cả
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="hidden h-8 w-full md:block" />
            {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((key) => (
              <Skeleton key={key} className="h-12 w-full" />
            ))}
          </div>
        ) : !items.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có giao dịch nào</p>
        ) : (
          <>
            <div className="hidden border-b border-border pb-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_100px_120px_100px_110px] md:gap-4">
              <span>Mô tả</span>
              <span>Thời gian</span>
              <span className="text-right">Số tiền</span>
              <span>Nguồn</span>
              <span>Trạng thái</span>
            </div>
            <div className="divide-y">
              {items.map((txn) => (
                <div
                  key={txn.id}
                  className="flex flex-col gap-2 py-3 first:pt-2 md:grid md:grid-cols-[minmax(0,1fr)_100px_120px_100px_110px] md:items-center md:gap-4 md:py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {txn.content ?? txn.transactionId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {formatTransactionTime(txn.transactionDate)}
                      {txn.senderAccount ? ` • ${txn.senderAccount}` : ''}
                    </p>
                    {txn.senderAccount ? (
                      <p className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">
                        {txn.senderAccount}
                      </p>
                    ) : null}
                  </div>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {formatTransactionTime(txn.transactionDate)}
                  </span>
                  <span className="text-sm font-semibold md:text-right">
                    <SignedTransactionAmount amount={Number(txn.amount)} />
                  </span>
                  <div className="flex items-center gap-2 md:block">
                    <span className="text-xs text-muted-foreground md:hidden">Nguồn:</span>
                    <TransactionSourceBadge source={txn.source} />
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className="text-xs text-muted-foreground md:hidden">Trạng thái:</span>
                    <TransactionStatusBadge
                      status={txn.status}
                      className={
                        txn.status === TransactionStatus.REVIEW
                          ? 'border-amber-500/30 bg-amber-500/10'
                          : undefined
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
