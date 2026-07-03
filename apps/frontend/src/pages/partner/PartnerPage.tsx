import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Percent, ShieldCheck, Wallet } from 'lucide-react';
import type { ElementType } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface PartnerStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  transactionsThisMonth: number;
  revenueThisMonth: number;
  aiAccuracy: number;
}

interface PartnerTenant {
  id: string;
  businessName: string;
  createdAt: string;
  plan: string | null;
  status: string;
  transactionsThisMonth: number;
  revenuePerMonth: number;
}

function formatVND(amount: number) {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M đ`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnerPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['partner', 'stats'],
    queryFn: () => api.get<{ data: PartnerStats }>('/partner/stats').then((r) => r.data.data),
  });

  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['partner', 'tenants'],
    queryFn: () => api.get<{ data: PartnerTenant[] }>('/partner/tenants').then((r) => r.data.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partner', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['partner', 'tenants'] });
  };

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/partner/tenants/${id}/suspend`),
    onSuccess: () => {
      toast.success('Đã khóa tài khoản doanh nghiệp');
      invalidate();
    },
    onError: () => toast.error('Không thể khóa tài khoản'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/partner/tenants/${id}/activate`),
    onSuccess: () => {
      toast.success('Đã mở khóa tài khoản doanh nghiệp');
      invalidate();
    },
    onError: () => toast.error('Không thể mở khóa tài khoản'),
  });

  return (
    <div className="min-h-svh bg-muted">
      <Header
        title="Partner Dashboard"
        description="Tổng quan toàn hệ thống X-Cash AI — dành cho Cas Partner"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            label="Tổng doanh nghiệp"
            value={loadingStats ? '—' : String(stats?.totalTenants ?? 0)}
          />
          <StatCard
            icon={ShieldCheck}
            label="Đang hoạt động"
            value={
              loadingStats
                ? '—'
                : `${stats?.activeTenants ?? 0} / ${stats?.suspendedTenants ?? 0} khóa`
            }
          />
          <StatCard
            icon={Wallet}
            label="Doanh thu tháng này"
            value={loadingStats ? '—' : formatVND(stats?.revenueThisMonth ?? 0)}
          />
          <StatCard
            icon={Percent}
            label="Độ chính xác AI toàn hệ thống"
            value={loadingStats ? '—' : `${stats?.aiAccuracy ?? 0}%`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách doanh nghiệp</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <TableSkeleton rows={6} columns={6} />
            ) : !tenants?.length ? (
              <EmptyState
                title="Chưa có doanh nghiệp nào"
                description="Danh sách sẽ hiện ra khi có tenant đăng ký"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Doanh nghiệp</th>
                      <th className="pb-2 pr-4 font-medium">Gói</th>
                      <th className="pb-2 pr-4 font-medium">Trạng thái</th>
                      <th className="pb-2 pr-4 font-medium">GD/tháng</th>
                      <th className="pb-2 pr-4 font-medium">Doanh thu</th>
                      <th className="pb-2 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium">{t.businessName}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary">
                            {t.plan ? (PLAN_LABELS[t.plan] ?? t.plan) : '—'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          {t.status === 'suspended' ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Đã khóa
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Hoạt động
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-4">{t.transactionsThisMonth}</td>
                        <td className="py-2 pr-4">{formatVND(t.revenuePerMonth)}</td>
                        <td className="py-2">
                          {t.status === 'suspended' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={activateMutation.isPending}
                              onClick={() => activateMutation.mutate(t.id)}
                            >
                              Mở khóa
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={suspendMutation.isPending}
                              onClick={() => suspendMutation.mutate(t.id)}
                            >
                              Khóa
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
