import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total?: number;
  label?: string;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  /** Show icon-only buttons (default: text "Trước"/"Sau" with chevrons) */
  compact?: boolean;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  label,
  isFetching = false,
  onPageChange,
  compact = false,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const PrevIcon = ChevronLeft as ElementType;
  const NextIcon = ChevronRight as ElementType;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <PrevIcon className="size-4" />
        </Button>
        <span className="text-sm tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <NextIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {total !== undefined && label ? (
        <p className="text-xs text-muted-foreground">{label.replace('{total}', String(total))}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <PrevIcon className="mr-1 size-4" />
          Trước
        </Button>
        <span className="text-sm tabular-nums">
          Trang {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Sau
          <NextIcon className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
