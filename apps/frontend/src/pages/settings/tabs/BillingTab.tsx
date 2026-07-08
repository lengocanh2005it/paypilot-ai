import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionPlan } from '@xcash/shared-types';
import { AlertTriangle, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { TransactionSourceBadge } from '@/components/shared/TransactionSourceBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredPagination } from '@/hooks/useFilteredPagination';
import { api } from '@/lib/api';
import { formatDateVN } from '@/lib/date';
import { formatVND } from '@/lib/format-vnd';
import { formatCopilotQuota, formatTransactionQuota, PLAN_LABEL } from '@/lib/plan';
import { canViewBilling, isAdmin } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import type {
  BillingPlan,
  CycleTransaction,
  OverageOrder,
  OveragePaymentResult,
  PaymentHistoryResponse,
  PlanData,
  UpgradeResult,
} from '@/types/api/billing';

// ─── Constants ────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'Liên kết ngân hàng Cas Link',
    'AI định khoản tự động TT133',
    'Dashboard & Human Review',
    'Danh mục tài khoản TT133',
  ],
  starter: ['AI Copilot hỏi đáp tài chính', 'Phân tích thu/chi nâng cao', 'Thông báo qua Email'],
  pro: ['Báo cáo & xuất Excel', 'Thông báo qua Slack', 'Vượt quota (tính phí theo gói)'],
  enterprise: ['Hỗ trợ ưu tiên từ đối tác Cas', 'Đồng hành triển khai doanh nghiệp'],
};

const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise'];

const ORDER_TYPE_LABEL: Record<string, string> = {
  upgrade: 'Nâng cấp gói',
  overage: 'Vượt quota',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  expired: 'Hết hạn',
};

const STATUS_CLASS: Record<string, string> = {
  pending:
    'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  paid: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  failed:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  expired: 'bg-muted text-muted-foreground border-border',
};

// ─── Helpers ──────────────────────────────────────────────────────

interface PlanFeatureLine {
  text: string;
  inherited?: boolean;
}

function getPlanFeatureLines(plan: string): PlanFeatureLine[] {
  const index = PLAN_ORDER.indexOf(plan);
  const own = (PLAN_FEATURES[plan] ?? []).map((text) => ({ text }));
  if (index <= 0) return own;
  const prev = PLAN_ORDER[index - 1];
  return [
    { text: `Mọi tính năng gói ${PLAN_LABEL[prev as SubscriptionPlan] ?? prev}`, inherited: true },
    ...own,
  ];
}

function formatPlanQuotaSubtitle(plan: BillingPlan): string {
  const quota = formatTransactionQuota(plan.transactionQuota);
  if (plan.overagePricePerTransaction != null) {
    return `${quota} · Phí vượt ${formatVND(plan.overagePricePerTransaction)}/GD`;
  }
  return quota;
}

// ─── PaymentHistoryTable ──────────────────────────────────────────

function PaymentHistoryTable() {
  const LIMIT = 10;

  const { data, filters, setFilter, resetFilters, setPage, isLoading } = useFilteredPagination({
    queryKey: ['billing', 'payment-history'],
    queryFn: ({ filters, page }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filters.orderType !== 'all') params.set('orderType', filters.orderType);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);
      return api
        .get<{ data: PaymentHistoryResponse }>(`/billing/payment-history?${params.toString()}`)
        .then((r) => r.data.data);
    },
    defaultFilters: { orderType: 'all', status: 'all', fromDate: '', toDate: '' },
    debounceMs: 400,
    keepPrevious: true,
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const hasActiveFilter =
    filters.orderType !== 'all' ||
    filters.status !== 'all' ||
    Boolean(filters.fromDate) ||
    Boolean(filters.toDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lịch sử thanh toán</CardTitle>
        <CardDescription>
          Toàn bộ giao dịch thanh toán gói dịch vụ và phí vượt quota
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={filters.orderType} onValueChange={(v) => setFilter('orderType', v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Loại giao dịch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="upgrade">Nâng cấp gói</SelectItem>
              <SelectItem value="overage">Vượt quota</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ thanh toán</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
              <SelectItem value="expired">Hết hạn</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilter('fromDate', e.target.value)}
              className="h-8 w-36 text-xs"
              placeholder="Từ ngày"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilter('toDate', e.target.value)}
              className="h-8 w-36 text-xs"
              placeholder="Đến ngày"
            />
          </div>

          {hasActiveFilter && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => resetFilters()}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Search className="size-8 opacity-30" />
            <p className="text-sm">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Mã đơn</th>
                  <th className="px-4 py-2.5 text-left font-medium">Loại</th>
                  <th className="px-4 py-2.5 text-left font-medium">Gói</th>
                  <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-2.5 text-left font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 text-left font-medium">Ngày tạo</th>
                  <th className="px-4 py-2.5 text-left font-medium">Ngày thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {o.orderCode}
                    </td>
                    <td className="px-4 py-3">{ORDER_TYPE_LABEL[o.orderType] ?? o.orderType}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs uppercase">
                        {PLAN_LABEL[o.targetPlan as SubscriptionPlan] ?? o.targetPlan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatVND(o.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          STATUS_CLASS[o.status],
                        )}
                      >
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateVN(o.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.paidAt ? formatDateVN(o.paidAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="pt-1">
            <PaginationBar
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              compact
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CycleTransactionsDialog ──────────────────────────────────────

interface CycleTransactionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycleStart: string;
  cycleEnd: string;
}

function CycleTransactionsDialog({
  open,
  onOpenChange,
  cycleStart,
  cycleEnd,
}: CycleTransactionsDialogProps) {
  const LIMIT = 15;

  const { data, filters, setFilter, resetFilters, page, setPage, isLoading } =
    useFilteredPagination({
      queryKey: ['billing', 'cycle-transactions'],
      queryFn: ({ filters, page }) => {
        const effectiveFrom = filters.fromDate
          ? new Date(
              Math.max(new Date(filters.fromDate).getTime(), new Date(cycleStart).getTime()),
            ).toISOString()
          : cycleStart;
        const effectiveTo = filters.toDate
          ? new Date(
              Math.min(
                new Date(`${filters.toDate}T23:59:59Z`).getTime(),
                new Date(cycleEnd).getTime(),
              ),
            ).toISOString()
          : cycleEnd;
        const params = new URLSearchParams({
          cycleStart: effectiveFrom,
          cycleEnd: effectiveTo,
          limit: String(LIMIT),
          page: String(page),
        });
        if (filters.search) params.set('search', filters.search);
        return api
          .get<{ data: { items: CycleTransaction[]; total: number; page: number; limit: number } }>(
            `/billing/cycle-transactions?${params.toString()}`,
          )
          .then((r) => r.data.data);
      },
      defaultFilters: { search: '', fromDate: '', toDate: '' },
      debounceMs: 400,
      enabled: open,
      keepPrevious: true,
    });

  const hasFilter = filters.search || filters.fromDate || filters.toDate;
  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Giao dịch trong chu kỳ hiện tại</DialogTitle>
          <DialogDescription>
            {formatDateVN(cycleStart)} — {formatDateVN(cycleEnd)} · Giao dịch đã tính quota
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo nội dung, số tài khoản..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.fromDate}
              min={cycleStart.slice(0, 10)}
              max={filters.toDate || cycleEnd.slice(0, 10)}
              onChange={(e) => setFilter('fromDate', e.target.value)}
              className="h-9 w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={filters.toDate}
              min={filters.fromDate || cycleStart.slice(0, 10)}
              max={cycleEnd.slice(0, 10)}
              onChange={(e) => setFilter('toDate', e.target.value)}
              className="h-9 w-36 text-xs"
            />
          </div>
          {hasFilter && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-xs text-muted-foreground px-2"
              onClick={() => resetFilters()}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto rounded-md border min-h-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Search className="size-8 opacity-30" />
              <p className="text-sm">Không tìm thấy giao dịch nào</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Ngày</th>
                  <th className="px-4 py-2.5 text-left font-medium">Nội dung</th>
                  <th className="px-4 py-2.5 text-left font-medium">Nguồn</th>
                  <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                  <th className="px-4 py-2.5 text-left font-medium">Định khoản</th>
                  <th className="px-4 py-2.5 text-left font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateVN(tx.transactionDate)}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="truncate text-xs">{tx.content || '—'}</p>
                      {tx.senderAccount && (
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {tx.senderAccount}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <TransactionSourceBadge source={tx.source} size="md" />
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-medium text-sm whitespace-nowrap',
                        tx.amount >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatVND(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {tx.classification
                        ? `Nợ ${tx.classification.debitAccount ?? '?'} / Có ${tx.classification.creditAccount ?? '?'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.classification ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                            tx.classification.status === 'classified'
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                              : tx.classification.status === 'review'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
                                : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          {tx.classification.status === 'classified'
                            ? 'Đã định khoản'
                            : tx.classification.status === 'review'
                              ? 'Chờ duyệt'
                              : tx.classification.status === 'skipped'
                                ? 'Bỏ qua'
                                : 'Chờ xử lý'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa định khoản</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t pt-1">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={data?.total ?? 0}
              compact
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── BillingTab ───────────────────────────────────────────────────

export function BillingTab() {
  const qc = useQueryClient();
  const { refreshSession, updateUser, user } = useAuth();
  const canAccessBilling = canViewBilling(user?.role);
  const isAdminUser = isAdmin(user?.role);

  const syncPlanFromBilling = useCallback(
    async (plan: string) => {
      updateUser({ plan: plan as SubscriptionPlan });
      await refreshSession();
    },
    [refreshSession, updateUser],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<UpgradeResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [overagePaymentOpen, setOveragePaymentOpen] = useState(false);
  const [overageResult, setOverageResult] = useState<OveragePaymentResult | null>(null);
  const [cycleDetailOpen, setCycleDetailOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('upgrade') === '1') {
      setUpgradeOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('upgrade');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'current-plan'],
    queryFn: () => api.get<{ data: PlanData }>('/billing/current-plan').then((r) => r.data.data),
    enabled: canAccessBilling,
    refetchInterval: paymentOpen ? 5_000 : false,
  });

  const { data: availablePlans, isLoading: loadingPlans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => api.get<{ data: BillingPlan[] }>('/billing/plans').then((r) => r.data.data),
    enabled: upgradeOpen && canAccessBilling,
  });

  const { data: overageOrders } = useQuery({
    queryKey: ['billing', 'overage-orders'],
    queryFn: () =>
      api.get<{ data: OverageOrder[] }>('/billing/overage-orders').then((r) => r.data.data),
    enabled: canAccessBilling && isAdminUser,
    refetchInterval: overagePaymentOpen ? 5_000 : 30_000,
  });

  const pendingOverage = overageOrders?.[0] ?? null;

  const overageOrderMutation = useMutation({
    mutationFn: () =>
      api.post<{ data: OveragePaymentResult }>('/billing/overage-order').then((r) => r.data.data),
    onSuccess: (result) => {
      setOverageResult(result);
      setOveragePaymentOpen(true);
    },
    onError: () => toast.error('Không thể tạo đơn thanh toán phí vượt quota'),
  });

  const mockConfirmOverageMutation = useMutation({
    mutationFn: (orderCode: string) => api.post(`/billing/overage-order/${orderCode}/mock-confirm`),
    onSuccess: () => {
      setOveragePaymentOpen(false);
      setOverageResult(null);
      qc.invalidateQueries({ queryKey: ['billing', 'overage-orders'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Demo: Đã thanh toán phí vượt quota!');
    },
    onError: () => toast.error('Không thể xác nhận mock'),
  });

  useEffect(() => {
    if (!data?.plan || data.plan === user?.plan) return;
    updateUser({ plan: data.plan as SubscriptionPlan });
  }, [data?.plan, updateUser, user?.plan]);

  const prevPlanRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!paymentOpen || !upgradeResult || !data) return;
    if (prevPlanRef.current && data.plan === upgradeResult?.orderCode) return;
    if (data.plan !== prevPlanRef.current && prevPlanRef.current !== undefined) {
      setPaymentOpen(false);
      setUpgradeResult(null);
      setSelectedPlan(null);
      toast.success(
        `Nâng cấp lên gói ${PLAN_LABEL[data.plan as SubscriptionPlan] ?? data.plan} thành công!`,
      );
      qc.invalidateQueries({ queryKey: ['billing', 'current-plan'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      void syncPlanFromBilling(data.plan);
    }
    prevPlanRef.current = data.plan;
  }, [data, paymentOpen, upgradeResult, qc, syncPlanFromBilling]);

  useEffect(() => {
    if (data && !paymentOpen) prevPlanRef.current = data.plan;
  }, [data, paymentOpen]);

  const upgradeMutation = useMutation({
    mutationFn: (targetPlan: string) =>
      api
        .post<{ data: UpgradeResult }>('/billing/upgrade', { targetPlan })
        .then((r) => r.data.data),
    onSuccess: (result) => {
      setUpgradeResult(result);
      setUpgradeOpen(false);
      setPaymentOpen(true);
      prevPlanRef.current = data?.plan;
    },
    onError: () => toast.error('Không thể tạo đơn thanh toán, vui lòng thử lại'),
  });

  const mockConfirmMutation = useMutation({
    mutationFn: (orderCode: string) => api.post(`/billing/upgrade/${orderCode}/mock-confirm`),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['billing', 'current-plan'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setPaymentOpen(false);
      setUpgradeResult(null);
      setSelectedPlan(null);
      toast.success('Demo: Thanh toán thành công!');
      const refreshed = await qc.fetchQuery({
        queryKey: ['billing', 'current-plan'],
        queryFn: () =>
          api.get<{ data: PlanData }>('/billing/current-plan').then((r) => r.data.data),
      });
      if (refreshed?.plan) {
        await syncPlanFromBilling(refreshed.plan);
      } else {
        await refreshSession();
      }
    },
    onError: () => toast.error('Không thể xác nhận mock'),
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const usedPct = data
    ? Math.min(100, Math.round((data.transactionUsed / data.transactionQuota) * 100))
    : 0;
  const isNearLimit = usedPct >= 80;

  const copilotUnlimited = data?.copilotQuota === -1;
  const copilotUsedPct =
    data && !copilotUnlimited
      ? Math.min(100, Math.round((data.copilotUsed / data.copilotQuota) * 100))
      : 0;
  const copilotNearLimit = copilotUsedPct >= 80;
  const copilotExceeded = copilotUsedPct >= 100;

  const isDev = import.meta.env.DEV;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Gói dịch vụ</CardTitle>
              <CardDescription>Gói hiện tại và usage của doanh nghiệp</CardDescription>
            </div>
            {data &&
              (data.plan === PLAN_ORDER[PLAN_ORDER.length - 1] ? (
                <Button size="sm" variant="outline" disabled>
                  Đã dùng gói cao nhất
                </Button>
              ) : isAdminUser ? (
                <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                  Nâng cấp gói
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-not-allowed">
                      <Button size="sm" disabled className="pointer-events-none">
                        Nâng cấp gói
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Chỉ chủ doanh nghiệp mới có thể nâng cấp gói</TooltipContent>
                </Tooltip>
              ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={data.plan === 'free' ? 'secondary' : 'default'}
                    className="uppercase"
                  >
                    {PLAN_LABEL[data.plan as SubscriptionPlan] ?? data.plan}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {data.pricePerMonth > 0 ? `${formatVND(data.pricePerMonth)}/tháng` : 'Miễn phí'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Hết chu kỳ: {formatDateVN(data.currentCycleEnd)}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giao dịch đã dùng</span>
                  <span className={cn('font-medium', isNearLimit && 'text-destructive')}>
                    {data.transactionUsed.toLocaleString()} /{' '}
                    {data.transactionQuota.toLocaleString()}
                  </span>
                </div>
                <Progress value={usedPct} className={cn(isNearLimit && '[&>div]:bg-destructive')} />
                {isNearLimit && (
                  <p className="text-xs text-destructive">
                    Sắp đạt giới hạn. Nâng cấp gói để tiếp tục nhận giao dịch.
                  </p>
                )}
                {data.transactionUsed > 0 &&
                  data.usageBreakdown &&
                  (data.usageBreakdown.fromBank > 0 || data.usageBreakdown.fromImport > 0) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-2 rounded-full bg-primary" />
                        Ngân hàng: {data.usageBreakdown.fromBank.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block size-2 rounded-full bg-amber-500" />
                        Import Excel: {data.usageBreakdown.fromImport.toLocaleString()}
                      </span>
                    </div>
                  )}
                {data.transactionUsed > 0 && (
                  <button
                    type="button"
                    onClick={() => setCycleDetailOpen(true)}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Xem chi tiết giao dịch trong chu kỳ →
                  </button>
                )}
              </div>

              {!copilotUnlimited && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lượt chat Copilot</span>
                    <span
                      className={cn(
                        'font-medium',
                        copilotExceeded
                          ? 'text-destructive'
                          : copilotNearLimit
                            ? 'text-orange-500'
                            : undefined,
                      )}
                    >
                      {data.copilotUsed.toLocaleString()} / {data.copilotQuota.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={copilotUsedPct}
                    className={cn(
                      copilotExceeded
                        ? '[&>div]:bg-destructive'
                        : copilotNearLimit
                          ? '[&>div]:bg-orange-500'
                          : undefined,
                    )}
                  />
                  {copilotExceeded && (
                    <p className="text-xs text-destructive">
                      Đã dùng hết lượt chat Copilot. Nâng cấp gói để tiếp tục.
                    </p>
                  )}
                  {copilotNearLimit && !copilotExceeded && (
                    <p className="text-xs text-orange-500">
                      Sắp hết lượt chat Copilot trong chu kỳ này.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PaymentHistoryTable />

      {pendingOverage && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              Có phí vượt quota chưa thanh toán
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Số tiền cần thanh toán:{' '}
              <span className="font-semibold">{formatVND(pendingOverage.amount)}</span>. Vui lòng
              thanh toán để tránh gián đoạn dịch vụ.
            </p>
          </div>
          {isAdminUser ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
              disabled={overageOrderMutation.isPending}
              onClick={() => overageOrderMutation.mutate()}
            >
              Thanh toán ngay
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-not-allowed">
                  <Button
                    size="sm"
                    variant="outline"
                    className="pointer-events-none shrink-0 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300"
                    disabled
                  >
                    Thanh toán ngay
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Chỉ chủ doanh nghiệp mới có thể thanh toán</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Dialog chọn gói */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="flex max-h-[min(88dvh,100%)] w-[min(42rem,calc(100vw-2.5rem))] max-w-2xl flex-col gap-0 overflow-hidden px-5 py-5 top-[6dvh] translate-y-0 sm:top-[50%] sm:translate-y-[-50%] sm:px-6 sm:py-6">
          <DialogHeader className="shrink-0 pb-3 pr-8">
            <DialogTitle>Chọn gói dịch vụ</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {loadingPlans
                ? Array.from({ length: 4 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
                    <Skeleton key={i} className="h-48 w-full rounded-xl" />
                  ))
                : (availablePlans ?? []).map((planItem) => {
                    const plan = planItem.plan;
                    const isCurrent = data?.plan === plan;
                    const currentPlanItem = availablePlans?.find((p) => p.plan === data?.plan);
                    const isLower =
                      !isCurrent &&
                      currentPlanItem != null &&
                      planItem.pricePerMonth < currentPlanItem.pricePerMonth;
                    const isDisabled = isCurrent || isLower;
                    const isSelected = selectedPlan === plan;
                    return (
                      <button
                        key={plan}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedPlan(plan)}
                        className={cn(
                          'w-full min-w-0 rounded-xl border p-4 text-left transition-all',
                          isDisabled
                            ? 'cursor-not-allowed border-primary/40 bg-primary/5 opacity-60'
                            : isSelected
                              ? 'border-primary ring-1 ring-primary'
                              : 'hover:border-primary/50',
                        )}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="font-semibold">
                            {PLAN_LABEL[plan as SubscriptionPlan] ?? plan}
                          </span>
                          {isCurrent && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              Hiện tại
                            </Badge>
                          )}
                          {isLower && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px] text-muted-foreground"
                            >
                              Không khả dụng
                            </Badge>
                          )}
                        </div>
                        <p className="mb-2 text-lg font-bold text-primary break-words">
                          {planItem.pricePerMonth === 0
                            ? 'Miễn phí'
                            : `${formatVND(planItem.pricePerMonth)}/tháng`}
                        </p>
                        <div className="mb-2 space-y-0.5 text-xs text-muted-foreground break-words">
                          <p>{formatPlanQuotaSubtitle(planItem)}</p>
                          <p>{formatCopilotQuota(planItem.copilotQuota, plan)}</p>
                        </div>
                        <ul className="space-y-1">
                          {getPlanFeatureLines(plan).map((f) => (
                            <li
                              key={f.text}
                              className={cn(
                                'flex items-start gap-1.5 text-xs break-words',
                                f.inherited
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              <span className="shrink-0 text-primary">✓</span>
                              <span>{f.text}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
            </div>
          </div>
          <DialogFooter className="mt-4 shrink-0 gap-2.5 border-t border-border pt-4 sm:gap-2">
            <Button variant="ghost" onClick={() => setUpgradeOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={!selectedPlan || upgradeMutation.isPending}
              onClick={() => selectedPlan && upgradeMutation.mutate(selectedPlan)}
            >
              {upgradeMutation.isPending ? 'Đang tạo đơn...' : 'Tiếp tục thanh toán'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog thanh toán */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Thanh toán nâng cấp gói</DialogTitle>
          </DialogHeader>
          {upgradeResult && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Số tiền:{' '}
                <span className="font-semibold text-foreground">
                  {formatVND(upgradeResult.amount)}
                </span>
              </p>

              {upgradeResult.qrCode ? (
                <div className="mx-auto w-fit rounded-lg border p-3">
                  <QRCodeSVG value={upgradeResult.qrCode} size={176} />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  {upgradeResult.isMock ? 'QR mock — chưa có PayOS key thật' : 'Đang tải QR...'}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(upgradeResult.checkoutUrl, '_blank')}
              >
                Mở trang thanh toán PayOS
              </Button>

              <p className="text-xs text-muted-foreground">
                Hệ thống tự cập nhật sau khi thanh toán xong. Có thể đóng cửa sổ này rồi quay lại
                sau.
              </p>

              {isDev && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={mockConfirmMutation.isPending}
                  onClick={() => mockConfirmMutation.mutate(upgradeResult.orderCode)}
                >
                  {mockConfirmMutation.isPending
                    ? 'Đang xử lý...'
                    : '🧪 Demo: Giả lập thanh toán thành công'}
                </Button>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setPaymentOpen(false)}
            >
              Đóng — thanh toán sau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog thanh toán phí vượt quota */}
      <Dialog open={overagePaymentOpen} onOpenChange={setOveragePaymentOpen}>
        <DialogContent
          className="max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Thanh toán phí vượt quota</DialogTitle>
          </DialogHeader>
          {overageResult && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Số giao dịch vượt:{' '}
                <span className="font-semibold text-foreground">
                  {overageResult.overageCount} GD
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Số tiền:{' '}
                <span className="font-semibold text-foreground">
                  {formatVND(overageResult.amount)}
                </span>
              </p>

              {overageResult.qrCode ? (
                <div className="mx-auto w-fit rounded-lg border p-3">
                  <QRCodeSVG value={overageResult.qrCode} size={176} />
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  {overageResult.isMock ? 'QR mock — chưa có PayOS key thật' : 'Đang tải QR...'}
                </div>
              )}

              {overageResult.checkoutUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(overageResult.checkoutUrl!, '_blank')}
                >
                  Mở trang thanh toán PayOS
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                Hệ thống tự cập nhật sau khi thanh toán xong.
              </p>

              {isDev && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={mockConfirmOverageMutation.isPending}
                  onClick={() => mockConfirmOverageMutation.mutate(overageResult.orderCode)}
                >
                  {mockConfirmOverageMutation.isPending
                    ? 'Đang xử lý...'
                    : '🧪 Demo: Giả lập thanh toán thành công'}
                </Button>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOveragePaymentOpen(false)}
            >
              Đóng — thanh toán sau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {data && (
        <CycleTransactionsDialog
          open={cycleDetailOpen}
          onOpenChange={setCycleDetailOpen}
          cycleStart={data.currentCycleStart}
          cycleEnd={data.currentCycleEnd}
        />
      )}
    </div>
  );
}
