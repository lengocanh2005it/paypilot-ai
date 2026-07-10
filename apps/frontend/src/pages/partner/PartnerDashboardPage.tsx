import { useQuery } from '@tanstack/react-query';
import { Bot, Building2, Percent, ShieldCheck, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from '@/components/layout/Header';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatUsdCost, USD_TO_VND_RATE, usdToVnd } from '@/lib/format-ai-cost';
import { formatVND, formatVNDAxis } from '@/lib/format-vnd';
import { PLAN_LABELS, PLAN_ORDER } from '@/lib/plans';
import type { DashboardStats, PartnerTenant, RevenueTrendPoint } from '@/types/partner';
import {
  PAID_PLANS,
  PLAN_COLORS,
  PlanTooltip,
  RevenueByPlanTooltip,
  TopRevenueTooltip,
} from './DashboardChartComponents';

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const hasDateFilter = fromDate !== '' || toDate !== '';

  const dateParams = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['partner', 'stats', dateParams],
    queryFn: () =>
      api
        .get<{ data: DashboardStats }>('/partner/stats', { params: dateParams })
        .then((r) => r.data.data),
  });

  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['partner', 'tenants'],
    queryFn: () =>
      api
        .get<{ data: { items: PartnerTenant[] } }>('/partner/tenants')
        .then((r) => r.data.data.items),
  });

  const { data: revenueTrend, isLoading: loadingTrend } = useQuery({
    queryKey: ['partner', 'revenue-trend', dateParams],
    queryFn: () =>
      api
        .get<{ data: RevenueTrendPoint[] }>('/partner/revenue-trend', { params: dateParams })
        .then((r) => r.data.data),
  });

  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const { data: aiCosts, isLoading: loadingAiCosts } = useQuery({
    queryKey: ['partner', 'ai-costs', currentMonthStart],
    queryFn: () =>
      api
        .get<{ data: { grandTotalCostUsd: number } }>('/partner/ai-costs', {
          params: { fromDate: currentMonthStart },
        })
        .then((r) => r.data.data),
  });

  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tenants ?? []) {
      const key = t.plan ?? 'free';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return PLAN_ORDER.filter((plan) => (counts.get(plan) ?? 0) > 0).map((plan) => ({
      plan,
      label: PLAN_LABELS[plan] ?? plan,
      count: counts.get(plan) ?? 0,
      color: PLAN_COLORS[plan] ?? 'var(--chart-1)',
    }));
  }, [tenants]);

  const planBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; activeCount: number; revenue: number }>();
    for (const t of tenants ?? []) {
      const key = t.plan ?? 'free';
      const cur = map.get(key) ?? { count: 0, activeCount: 0, revenue: 0 };
      const isActive = t.status === 'active';
      map.set(key, {
        count: cur.count + 1,
        activeCount: cur.activeCount + (isActive ? 1 : 0),
        revenue: cur.revenue + (isActive ? t.revenuePerMonth : 0),
      });
    }
    const total = tenants?.length ?? 0;
    return PLAN_ORDER.map((plan) => ({
      plan,
      label: PLAN_LABELS[plan] ?? plan,
      color: PLAN_COLORS[plan] ?? 'var(--chart-1)',
      count: map.get(plan)?.count ?? 0,
      activeCount: map.get(plan)?.activeCount ?? 0,
      revenue: map.get(plan)?.revenue ?? 0,
      pct: total > 0 ? Math.round(((map.get(plan)?.count ?? 0) / total) * 100) : 0,
    }));
  }, [tenants]);

  // MRR (doanh thu định kỳ) tính từ cùng nguồn `tenants` với breakdown bên dưới,
  // để card tổng và bảng phân bố không bao giờ lệch nhau.
  const mrr = useMemo(
    () => planBreakdown.reduce((sum, row) => sum + row.revenue, 0),
    [planBreakdown],
  );

  const topRevenue = useMemo(() => {
    return [...(tenants ?? [])]
      .filter((t) => t.status === 'active' && t.revenuePerMonth > 0)
      .sort((a, b) => b.revenuePerMonth - a.revenuePerMonth)
      .slice(0, 5)
      .map((t) => ({
        name: t.businessName.length > 15 ? `${t.businessName.slice(0, 15)}…` : t.businessName,
        revenue: t.revenuePerMonth,
      }));
  }, [tenants]);

  return (
    <>
      <Header
        title="Dashboard"
        description="Tổng quan toàn hệ thống X-Cash AI"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Từ ngày"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="sm:w-[9.5rem]"
            />
            <span className="text-sm text-muted-foreground">→</span>
            <Input
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="sm:w-[9.5rem]"
            />
            {hasDateFilter ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
              >
                Xóa lọc
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            icon={Building2}
            label="Tổng doanh nghiệp"
            value={String(stats?.totalTenants ?? 0)}
            isLoading={loadingStats}
            hint="Tổng số DN đã đăng ký toàn hệ thống (mọi gói, mọi trạng thái)"
          />
          <SummaryCard
            icon={ShieldCheck}
            label="Hoạt động / Đã khóa"
            value={`${stats?.activeTenants ?? 0} / ${stats?.suspendedTenants ?? 0}`}
            isLoading={loadingStats}
            hint="DN đang dùng dịch vụ · DN bị khóa (subscription suspended)"
          />
          <SummaryCard
            icon={Wallet}
            label="Doanh thu định kỳ (MRR)"
            value={formatVND(mrr)}
            isLoading={loadingTenants}
            hint={
              hasDateFilter
                ? 'Tính tại thời điểm hiện tại — không theo kỳ lọc ngày'
                : 'Giá gói/tháng của DN đang hoạt động · số dự kiến, chưa gồm phí vượt'
            }
          />
          <SummaryCard
            icon={Percent}
            label="Độ chính xác AI"
            value={`${stats?.aiAccuracy ?? 0}%`}
            isLoading={loadingStats}
            hint={
              hasDateFilter
                ? 'Tỷ lệ giao dịch AI tự định khoản (auto) trong kỳ đã chọn'
                : 'Tỷ lệ giao dịch AI tự định khoản (auto) trên tổng đã định khoản trong tháng'
            }
          />
          <SummaryCard
            icon={Bot}
            label="Chi phí AI tháng này"
            value={formatUsdCost(aiCosts?.grandTotalCostUsd ?? 0)}
            subValue={
              (aiCosts?.grandTotalCostUsd ?? 0) > 0
                ? `~${formatVND(usdToVnd(aiCosts?.grandTotalCostUsd ?? 0))}`
                : undefined
            }
            isLoading={loadingAiCosts}
            hint={`Tổng OpenAI API tháng hiện tại · 1 USD ≈ ${USD_TO_VND_RATE.toLocaleString('vi-VN')}đ · click xem chi tiết`}
            onClick={() => navigate('/partner/ai-costs')}
          />
        </div>

        {/* Doanh thu theo gói theo tháng — biểu đồ nhiều đường */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Doanh thu theo gói theo tháng</CardTitle>
                <CardDescription>
                  Tiền thực thu (PayOS) theo từng gói dịch vụ
                  {hasDateFilter ? ' trong kỳ đã chọn' : ' trong 6 tháng gần nhất'} — mỗi đường là
                  một gói
                </CardDescription>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {hasDateFilter ? 'Thực thu trong kỳ' : 'Thực thu tháng này'}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {loadingStats ? '—' : formatVND(stats?.paidRevenueThisMonth ?? 0)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={revenueTrend ?? []}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(value: number) => formatVNDAxis(value)}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    />
                    <Tooltip content={<RevenueByPlanTooltip />} />
                    {PAID_PLANS.map((plan) => (
                      <Line
                        key={plan}
                        type="monotone"
                        dataKey={plan}
                        name={plan}
                        stroke={PLAN_COLORS[plan]}
                        strokeWidth={2}
                        dot={{ fill: PLAN_COLORS[plan], r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                  {PAID_PLANS.map((plan) => (
                    <div key={plan} className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: PLAN_COLORS[plan] }}
                      />
                      <span className="text-muted-foreground">{PLAN_LABELS[plan]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Phân bố gói dịch vụ</CardTitle>
              <CardDescription>
                Số lượng doanh nghiệp theo từng gói
                {hasDateFilter ? ' · snapshot hiện tại, không theo kỳ lọc' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTenants ? (
                <Skeleton className="h-[260px] w-full" />
              ) : planDistribution.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {planDistribution.map((entry) => (
                        <Cell key={entry.plan} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PlanTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {planDistribution.length > 0 ? (
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                  {planDistribution.map((entry) => (
                    <div key={entry.plan} className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">
                        {entry.label} ({entry.count})
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top doanh nghiệp theo doanh thu định kỳ</CardTitle>
              <CardDescription>
                5 DN đang hoạt động có giá gói/tháng (MRR) cao nhất — không phải tiền đã thu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTenants ? (
                <Skeleton className="h-[260px] w-full" />
              ) : topRevenue.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                  Chưa có doanh nghiệp trả phí
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={topRevenue}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: number) => formatVNDAxis(value)}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={110}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    />
                    <Tooltip
                      content={<TopRevenueTooltip />}
                      cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                    />
                    <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
