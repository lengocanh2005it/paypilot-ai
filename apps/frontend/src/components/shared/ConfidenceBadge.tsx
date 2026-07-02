import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  score: number | null | undefined;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  if (score == null) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        —
      </Badge>
    );
  }

  if (score >= 95) {
    return (
      <Badge variant="success" className={className}>
        {score}%
      </Badge>
    );
  }

  if (score >= 50) {
    return (
      <Badge variant="warning" className={className}>
        {score}%
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={className}>
      {score}%
    </Badge>
  );
}
