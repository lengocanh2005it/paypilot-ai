import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportResult {
  batchId: string;
  imported: number;
  skipped: number;
  skippedReasons?: Array<{ row: number; reason: string }>;
  quotaWarning?: string;
}

interface ImportResultStepProps {
  importResult: ImportResult;
  onReset: () => void;
  onClose: () => void;
}

export function ImportResultStep({ importResult, onReset, onClose }: ImportResultStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-12 text-primary" />
        <div>
          <p className="text-xl font-bold">Import thành công!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Đã nhập <span className="font-semibold text-foreground">{importResult.imported}</span>{' '}
            giao dịch
            {importResult.skipped > 0 ? (
              <>
                , bỏ qua{' '}
                <span className="font-semibold text-foreground">{importResult.skipped}</span> trùng
                lặp
              </>
            ) : null}
          </p>
        </div>
      </div>

      {importResult.quotaWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          {importResult.quotaWarning}
        </div>
      )}

      {importResult.skippedReasons && importResult.skippedReasons.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Dòng bỏ qua</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {importResult.skippedReasons.slice(0, 5).map((r) => (
              <li key={r.row}>
                Dòng {r.row}: {r.reason}
              </li>
            ))}
            {importResult.skippedReasons.length > 5 && (
              <li>...và {importResult.skippedReasons.length - 5} dòng khác</li>
            )}
          </ul>
        </div>
      )}

      {importResult.imported > 0 && (
        <p className="text-sm text-muted-foreground">
          AI đang phân loại giao dịch — kết quả sẽ hiển thị trong danh sách trong vài giây.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1">
          Import thêm
        </Button>
        <Button onClick={onClose} className="flex-1">
          Đóng
        </Button>
      </div>
    </div>
  );
}
