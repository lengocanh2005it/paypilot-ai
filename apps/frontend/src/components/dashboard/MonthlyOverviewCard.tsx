import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/dashboard-transactions';
import { cn } from '@/lib/utils';

interface MonthlyOverviewCardProps {
  month: number;
  year: number;
  revenue: number;
  expense: number;
  net: number;
  isLoading?: boolean;
}

export function MonthlyOverviewCard({
  month,
  year,
  revenue,
  expense,
  net,
  isLoading,
}: MonthlyOverviewCardProps) {
  const totalFlow = revenue + expense;
  const revenuePct = totalFlow > 0 ? (revenue / totalFlow) * 100 : 50;
  const expensePct = totalFlow > 0 ? (expense / totalFlow) * 100 : 50;
  const isPositive = net >= 0;

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Tổng quan tháng {month}/{year}
        </CardTitle>
        <CardDescription>Doanh thu và chi phí đã định khoản trong tháng hiện tại</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {(['revenue', 'expense', 'net'] as const).map((key) => (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="size-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Doanh thu</span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ArrowDownRight className="size-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Chi phí</span>
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-red-700 dark:text-red-300">
                {formatCurrency(expense)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4',
                isPositive
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-amber-200/60 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2',
                  isPositive ? 'text-primary' : 'text-amber-700 dark:text-amber-400',
                )}
              >
                <Scale className="size-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Lãi / lỗ</span>
              </div>
              <p
                className={cn(
                  'mt-2 text-xl font-bold tabular-nums',
                  isPositive ? 'text-primary' : 'text-amber-800 dark:text-amber-300',
                )}
              >
                {formatCurrency(net)}
              </p>
            </div>
          </div>
        )}

        {!isLoading && totalFlow > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Cơ cấu thu chi</span>
              <span>
                {revenuePct.toFixed(0)}% thu · {expensePct.toFixed(0)}% chi
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-[var(--chart-1)] transition-all"
                style={{ width: `${revenuePct}%` }}
              />
              <div
                className="bg-[var(--chart-5)] transition-all"
                style={{ width: `${expensePct}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
