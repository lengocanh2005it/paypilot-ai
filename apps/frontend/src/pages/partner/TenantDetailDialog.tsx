import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateVN } from '@/lib/date';
import { formatVND } from '@/lib/format-vnd';
import { PLAN_LABELS } from '@/lib/plans';
import type { TenantDetail } from '@/types/partner';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Kế toán',
  viewer: 'Người xem',
  cas_partner: 'Cas Partner',
};

interface TenantDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantDetail: TenantDetail | null;
  loadingDetail: boolean;
}

export function TenantDetailDialog({
  open,
  onOpenChange,
  tenantDetail,
  loadingDetail,
}: TenantDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tenantDetail?.businessName ?? 'Chi tiết doanh nghiệp'}</DialogTitle>
        </DialogHeader>
        {loadingDetail || !tenantDetail ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Chủ doanh nghiệp</p>
                <p className="font-medium">{tenantDetail.ownerName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gói</p>
                <p className="font-medium">
                  {tenantDetail.plan ? (PLAN_LABELS[tenantDetail.plan] ?? tenantDetail.plan) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                {tenantDetail.status === 'suspended' ? (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Đã khóa
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Hoạt động
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Giá/tháng</p>
                <p className="font-medium">{formatVND(tenantDetail.pricePerMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ngưỡng định khoản tự động</p>
                <p className="font-medium">{tenantDetail.classificationThreshold}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quota GD/chu kỳ</p>
                <p className="font-medium">
                  {tenantDetail.transactionUsedThisCycle} / {tenantDetail.transactionQuota}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GD tháng này / tổng</p>
                <p className="font-medium">
                  {tenantDetail.transactionsThisMonth} / {tenantDetail.totalTransactions}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Độ chính xác AI (tháng này)</p>
                <p className="font-medium">{tenantDetail.aiAccuracy}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ngày tạo</p>
                <p className="font-medium">{formatDateVN(tenantDetail.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Thành viên ({tenantDetail.members.length})
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {tenantDetail.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
