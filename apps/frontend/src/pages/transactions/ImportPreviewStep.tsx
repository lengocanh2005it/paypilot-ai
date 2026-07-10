import { AlertCircle, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatVND } from '@/lib/format-vnd';

interface RowError {
  row: number;
  column?: string;
  value?: string;
  message: string;
}

interface RowWarning {
  row: number;
  message: string;
}

interface ValidateResult {
  valid: boolean;
  totalRows?: number;
  errorCount?: number;
  errors?: RowError[];
  warnings?: RowWarning[];
  quotaImpact?: {
    willUse: number;
    remaining: number;
    willExceedQuota: boolean;
  };
  preview?: Array<{
    row: number;
    date: string;
    description: string;
    amount: number;
    direction: 'in' | 'out';
  }>;
}

interface ImportPreviewStepProps {
  selectedFile: File;
  validateResult: ValidateResult;
  isImportPending: boolean;
  onReset: () => void;
  onImport: () => void;
}

export function ImportPreviewStep({
  selectedFile,
  validateResult,
  isImportPending,
  onReset,
  onImport,
}: ImportPreviewStepProps) {
  return (
    <div className="space-y-4">
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {!validateResult.valid ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            <p className="font-medium">
              File có {validateResult.errorCount} lỗi — vui lòng sửa và upload lại
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Dòng</th>
                  <th className="px-3 py-2 text-left font-medium">Cột</th>
                  <th className="px-3 py-2 text-left font-medium">Giá trị</th>
                  <th className="px-3 py-2 text-left font-medium">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {validateResult.errors?.map((err) => (
                  <tr key={`${err.row}-${err.column ?? 'r'}`} className="border-t">
                    <td className="px-3 py-2 font-mono">{err.row}</td>
                    <td className="px-3 py-2 text-muted-foreground">{err.column ?? '—'}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">
                      {err.value ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-destructive">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={onReset} className="w-full">
            Chọn file khác
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quota */}
          {validateResult.quotaImpact && (
            <div
              className={`rounded-lg border p-3 text-sm ${validateResult.quotaImpact.willExceedQuota ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400' : 'border-border bg-muted/30'}`}
            >
              <div className="flex items-center justify-between">
                <span>Sẽ dùng {validateResult.quotaImpact.willUse} slot quota</span>
                <span className="text-muted-foreground">
                  Còn lại: {validateResult.quotaImpact.remaining}
                </span>
              </div>
              {validateResult.quotaImpact.willExceedQuota && (
                <p className="mt-1 font-medium">
                  Vượt quota — phí vượt sẽ tính vào chu kỳ hiện tại
                </p>
              )}
              {validateResult.quotaImpact.remaining > 0 && (
                <Progress
                  className="mt-2 h-1.5"
                  value={Math.min(
                    100,
                    (validateResult.quotaImpact.willUse /
                      (validateResult.quotaImpact.remaining + validateResult.quotaImpact.willUse)) *
                      100,
                  )}
                />
              )}
            </div>
          )}

          {/* Warnings */}
          {validateResult.warnings && validateResult.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
              <p className="font-medium">
                {validateResult.warnings.length} cảnh báo (không ảnh hưởng import)
              </p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {validateResult.warnings.slice(0, 5).map((w) => (
                  <li key={w.row}>
                    Dòng {w.row}: {w.message}
                  </li>
                ))}
                {validateResult.warnings.length > 5 && (
                  <li>...và {validateResult.warnings.length - 5} cảnh báo khác</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview table */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Xem trước ({validateResult.totalRows} dòng, hiện 5 dòng đầu)
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ngày</th>
                    <th className="px-3 py-2 text-left font-medium">Mô tả</th>
                    <th className="px-3 py-2 text-right font-medium">Số tiền</th>
                    <th className="px-3 py-2 text-center font-medium">Loại</th>
                  </tr>
                </thead>
                <tbody>
                  {validateResult.preview?.map((row) => (
                    <tr key={row.row} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                      <td className="max-w-[200px] truncate px-3 py-2">{row.description}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatVND(row.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant="outline"
                          className={
                            row.direction === 'in'
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-destructive/30 bg-destructive/10 text-destructive'
                          }
                        >
                          {row.direction === 'in' ? 'Thu' : 'Chi'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onReset} disabled={isImportPending}>
              Chọn file khác
            </Button>
            <Button className="flex-1" onClick={onImport} disabled={isImportPending}>
              {isImportPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang import...
                </>
              ) : (
                `Import ${validateResult.totalRows} giao dịch`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
