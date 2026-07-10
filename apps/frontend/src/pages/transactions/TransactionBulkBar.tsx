import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TransactionBulkBarProps {
  selectedCount: number;
  selectedPendingCount: number;
  isPending: boolean;
  onClearSelection: () => void;
  onBulkReclassify: () => void;
}

export function TransactionBulkBar({
  selectedCount,
  selectedPendingCount,
  isPending,
  onClearSelection,
  onBulkReclassify,
}: TransactionBulkBarProps) {
  return (
    <Card className="border-primary/20 bg-primary/5 py-3">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Đã chọn {selectedCount} giao dịch
          {selectedPendingCount < selectedCount ? (
            <span className="ml-1 font-normal text-muted-foreground">
              ({selectedPendingCount} đang chờ xử lý)
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClearSelection} disabled={isPending}>
            Bỏ chọn
          </Button>
          <Button
            size="sm"
            onClick={onBulkReclassify}
            disabled={isPending || selectedPendingCount === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Định khoản lại hàng loạt
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
