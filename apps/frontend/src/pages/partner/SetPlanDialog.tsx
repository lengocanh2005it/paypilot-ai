import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatVND } from '@/lib/format-vnd';
import { PLAN_LABELS } from '@/lib/plans';
import type { PartnerTenant, PlanPricingItem } from '@/types/partner';

interface SetPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: PartnerTenant | null;
  planPricing: PlanPricingItem[] | null;
  selectedPlan: string;
  onSelectedPlanChange: (plan: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function SetPlanDialog({
  open,
  onOpenChange,
  target,
  planPricing,
  selectedPlan,
  onSelectedPlanChange,
  onConfirm,
}: SetPlanDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Đổi gói dịch vụ</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Doanh nghiệp:{' '}
            <span className="font-medium text-foreground">{target?.businessName}</span>
          </p>
          <p className="text-muted-foreground">
            Gói hiện tại:{' '}
            <span className="font-medium text-foreground">
              {target?.plan ? (PLAN_LABELS[target.plan] ?? target.plan) : '—'}
            </span>
          </p>
          <div className="space-y-1.5">
            <p className="font-medium">Chọn gói mới</p>
            <Select value={selectedPlan} onValueChange={onSelectedPlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn gói..." />
              </SelectTrigger>
              <SelectContent>
                {(planPricing ?? []).map((p) => (
                  <SelectItem key={p.plan} value={p.plan}>
                    <span className="flex items-center gap-2">
                      <span>{PLAN_LABELS[p.plan] ?? p.plan}</span>
                      <span className="text-xs text-muted-foreground">
                        —{' '}
                        {p.pricePerMonth === 0 ? 'Miễn phí' : `${formatVND(p.pricePerMonth)}/tháng`}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Hủy
          </Button>
          <Button disabled={!selectedPlan || selectedPlan === target?.plan} onClick={onConfirm}>
            Tiếp tục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
