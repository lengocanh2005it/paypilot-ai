import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardStatCard({
  label,
  value,
  footer,
  action,
  className,
}: DashboardStatCardProps) {
  return (
    <Card className={cn('h-full gap-0 py-5', className)}>
      <CardHeader className="gap-1 px-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-lg">{value}</CardTitle>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      {footer ? <CardContent className="mt-auto px-5 pt-4">{footer}</CardContent> : null}
    </Card>
  );
}
