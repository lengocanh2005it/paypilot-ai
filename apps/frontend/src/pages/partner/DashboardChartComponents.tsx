import { formatVND } from '@/lib/format-vnd';
import { PLAN_LABELS } from '@/lib/plans';

export const PLAN_COLORS: Record<string, string> = {
  free: 'var(--chart-4)',
  starter: 'var(--chart-2)',
  pro: 'var(--chart-1)',
  enterprise: 'var(--chart-5)',
};

export const PAID_PLANS = ['starter', 'pro', 'enterprise'] as const;

interface TooltipEntry {
  value?: number | string;
  name?: string;
  payload?: { name?: string; label?: string };
}

export function ChartTooltip({
  active,
  title,
  value,
}: {
  active?: boolean;
  title?: string;
  value?: string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      {title ? <p className="font-medium">{title}</p> : null}
      <p className="text-primary">{value}</p>
    </div>
  );
}

export function RevenueByPlanTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">Tháng {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground">
          {PLAN_LABELS[entry.name ?? ''] ?? entry.name}:{' '}
          <span className="font-medium text-foreground">{formatVND(Number(entry.value ?? 0))}</span>
        </p>
      ))}
      <p className="mt-1 border-t pt-1">
        Tổng: <span className="font-medium">{formatVND(total)}</span>
      </p>
    </div>
  );
}

export function PlanTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return <ChartTooltip active title={entry?.name} value={`${entry?.value} doanh nghiệp`} />;
}

export function TopRevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <ChartTooltip
      active
      title={entry?.payload?.name}
      value={`${formatVND(Number(entry?.value ?? 0))}/tháng (giá gói)`}
    />
  );
}
