import { CheckCircle, Pencil, SkipForward } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge';
import { CopyIdButton } from '@/components/shared/CopyIdButton';
import { Button } from '@/components/ui/button';
import { formatDateVN } from '@/lib/date';
import type { ClassificationItem } from '@/types/api/review';

const SWIPE_THRESHOLD = 80;

function formatAmount(amount: string | number) {
  return Number(amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export function SwipeableReviewCard({
  item,
  onConfirm,
  onSkip,
  onCorrect,
  disabled,
  readOnly = false,
}: {
  item: ClassificationItem;
  onConfirm: () => void;
  onSkip: () => void;
  onCorrect: () => void;
  disabled: boolean;
  readOnly?: boolean;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  if (readOnly) {
    return (
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {item.transaction.content ?? '—'}
          </p>
          <ConfidenceBadge score={item.confidenceScore} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatDateVN(item.transaction.transactionDate)}
          </span>
          <span className="font-mono">{formatAmount(item.transaction.amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm font-medium">
            {item.debitAccount} / {item.creditAccount}
          </p>
          <CopyIdButton id={item.transaction.id} />
        </div>
      </div>
    );
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    startX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };

  const handlePointerEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      onConfirm();
    } else if (dragX < -SWIPE_THRESHOLD) {
      onSkip();
    }
    setDragX(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
      e.preventDefault();
      onSkip();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
          <CheckCircle className="size-4" /> Xác nhận
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          Bỏ qua <SkipForward className="size-4" />
        </span>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: swipeable card needs div for pointer events */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Giao dịch: ${item.transaction.content ?? 'không có nội dung'}, nhấn Enter để xác nhận, Escape để bỏ qua`}
        className="relative touch-pan-y space-y-2 bg-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {item.transaction.content ?? '—'}
          </p>
          <ConfidenceBadge score={item.confidenceScore} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatDateVN(item.transaction.transactionDate)}
          </span>
          <span className="font-mono">{formatAmount(item.transaction.amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium">
            {item.debitAccount} / {item.creditAccount}
          </span>
          <CopyIdButton id={item.transaction.id} />
        </div>
        <div className="flex items-center justify-end">
          <Button
            size="icon-sm"
            variant="ghost"
            title="Sửa"
            aria-label="Sửa định khoản"
            onClick={onCorrect}
          >
            <Pencil className="size-4 text-blue-600" />
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Vuốt phải để xác nhận, vuốt trái để bỏ qua
        </p>
      </div>
    </div>
  );
}
