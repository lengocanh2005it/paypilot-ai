import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Brain, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { BankStatusCard } from '@/components/dashboard/BankStatusCard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { RevenueLineChart } from '@/components/dashboard/RevenueLineChart';
import { TransactionStatusChart } from '@/components/dashboard/TransactionStatusChart';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { getApiData } from '@/lib/api';
import {
  buildDailyRevenueTrend,
  buildDashboardOverviewStats,
  buildTransactionStatusBreakdown,
  formatCurrency,
} from '@/lib/dashboard-transactions';
import type { TransactionListResponse } from '@/types/transaction';

const DASHBOARD_TRANSACTION_LIMIT = 100;

export default function DashboardPage() {
  const { user, onboardingStatus } = useAuth();
  const bankingLinked = Boolean(onboardingStatus?.bankingLinked);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'dashboard'],
    queryFn: () =>
      getApiData<TransactionListResponse>(`/transactions?limit=${DASHBOARD_TRANSACTION_LIMIT}`),
    enabled: bankingLinked,
    refetchInterval: 10_000,
  });

  const items = data?.items ?? [];
  const stats = useMemo(() => buildDashboardOverviewStats(items), [items]);
  const revenueTrend = useMemo(() => buildDailyRevenueTrend(items), [items]);
  const statusData = useMemo(() => buildTransactionStatusBreakdown(items), [items]);
  const recentItems = useMemo(() => items.slice(0, 5), [items]);

  const revenueFooter =
    stats.revenueChangePercent != null ? (
      <p
        className={
          stats.revenueChangePercent >= 0 ? 'text-xs text-primary' : 'text-xs text-destructive'
        }
      >
        {stats.revenueChangePercent >= 0 ? '↑' : '↓'}{' '}
        {Math.abs(stats.revenueChangePercent).toFixed(1)}% so với hôm qua
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">Chưa có dữ liệu so sánh hôm qua</p>
    );

  return (
    <>
      <Header title="Dashboard" description={`Xin chào, ${user?.name ?? 'bạn'}`} />

      <div className="space-y-6 p-4 sm:p-6">
        <BankStatusCard bankingLinked={bankingLinked} grants={onboardingStatus?.grants ?? []} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bankingLinked && isLoading ? (
            (['revenue', 'pending', 'review', 'accuracy'] as const).map((key) => (
              <Skeleton key={key} className="h-[120px] w-full rounded-xl" />
            ))
          ) : (
            <>
              <DashboardStatCard
                label="Doanh thu hôm nay"
                value={formatCurrency(stats.todayRevenue)}
                icon={TrendingUp}
                footer={revenueFooter}
              />
              <DashboardStatCard
                label="Giao dịch chưa xử lý"
                value={stats.pendingCount}
                icon={Clock}
                footer={<p className="text-xs text-muted-foreground">Đang chờ AI ghép hóa đơn</p>}
              />
              <DashboardStatCard
                label="Chờ review"
                value={stats.reviewCount}
                icon={AlertCircle}
                footer={
                  stats.reviewCount > 0 ? (
                    <p className="text-xs text-amber-600">Cần xem xét thủ công</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Không có giao dịch cần xem xét</p>
                  )
                }
              />
              <DashboardStatCard
                label="AI Match accuracy"
                value={
                  stats.aiAccuracyPercent != null ? `${stats.aiAccuracyPercent.toFixed(1)}%` : '—'
                }
                icon={Brain}
                footer={
                  <p className="text-xs text-muted-foreground">
                    Tỷ lệ confidence ≥ 95% trên giao dịch đã xử lý
                  </p>
                }
              />
            </>
          )}
        </div>

        <RevenueLineChart data={revenueTrend} isLoading={bankingLinked && isLoading} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactionsCard items={recentItems} isLoading={bankingLinked && isLoading} />
          </div>
          <TransactionStatusChart data={statusData} isLoading={bankingLinked && isLoading} />
        </div>
      </div>
    </>
  );
}
