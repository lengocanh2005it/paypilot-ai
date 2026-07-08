import type { LucideIcon } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon | ElementType;
  subValue?: string;
  hint?: string;
  footer?: ReactNode;
  action?: ReactNode;
  isLoading?: boolean;
  className?: string;
  to?: string;
  onClick?: () => void;
}

export function StatCardIconBadge({ icon: Icon }: { icon: LucideIcon | ElementType }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="size-4" />
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subValue,
  hint,
  footer,
  action,
  isLoading,
  className,
  to,
  onClick,
}: StatCardProps) {
  const headerAction = action ?? (Icon ? <StatCardIconBadge icon={Icon} /> : null);

  const card = (
    <Card
      className={cn(
        'h-full gap-0 py-5',
        (to || onClick) && 'transition-shadow hover:shadow-md cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="gap-1 px-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardDescription>{label}</CardDescription>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <CardTitle className="text-lg">{value}</CardTitle>
            )}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </CardHeader>
      {(subValue || hint || footer) && (
        <CardContent className="mt-auto px-5 pt-4">
          {subValue ? (
            <p className="text-sm font-medium text-muted-foreground tabular-nums">{subValue}</p>
          ) : null}
          {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
          {footer}
        </CardContent>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {card}
      </Link>
    );
  }

  return card;
}
