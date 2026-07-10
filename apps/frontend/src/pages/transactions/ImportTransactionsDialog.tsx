import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportResultStep } from './ImportResultStep';
import { ImportUploadStep } from './ImportUploadStep';

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

interface ImportResult {
  batchId: string;
  imported: number;
  skipped: number;
  skippedReasons?: Array<{ row: number; reason: string }>;
  quotaWarning?: string;
}

type Step = 'upload' | 'preview' | 'result';

interface ImportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: ImportResult) => void;
}

export function ImportTransactionsDialog({
  open,
  onOpenChange,
  onImported,
}: ImportTransactionsDialogProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post<{ success: boolean; data: ValidateResult }>(
        '/transactions/import/validate',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.data;
    },
    onSuccess: (result) => {
      setValidateResult(result);
      setStep('preview');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Không thể đọc file — vui lòng kiểm tra lại'));
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post<{ success: boolean; data: ImportResult }>(
        '/transactions/import',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.data;
    },
    onSuccess: (result) => {
      setImportResult(result);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['review'] });
      onImported?.(result);
      toast.success(
        `Đã import ${result.imported.toLocaleString()} giao dịch — đang lọc theo Import Excel`,
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Import thất bại — vui lòng thử lại'));
    },
  });

  function reset() {
    setStep('upload');
    setSelectedFile(null);
    setValidateResult(null);
    setImportResult(null);
    validateMutation.reset();
    importMutation.reset();
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  function handleFileSelect(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File quá lớn — tối đa 2MB');
      return;
    }
    setSelectedFile(file);
    validateMutation.mutate(file);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập giao dịch từ Excel</DialogTitle>
          <DialogDescription>
            Upload file Excel theo mẫu để nhập giao dịch tiền mặt hoặc ngân hàng chưa liên kết
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(['upload', 'preview', 'result'] as Step[]).map((s, i) => {
            const labels = ['1. Chọn file', '2. Kiểm tra', '3. Kết quả'];
            const isActive = step === s;
            const isDone =
              (s === 'upload' && (step === 'preview' || step === 'result')) ||
              (s === 'preview' && step === 'result');
            return (
              <span
                key={s}
                className={`flex items-center gap-1 ${isActive ? 'font-semibold text-primary' : isDone ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {i > 0 && <span className="text-muted-foreground">›</span>}
                {labels[i]}
              </span>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <ImportUploadStep
            isPending={validateMutation.isPending}
            onFileSelect={handleFileSelect}
          />
        )}

        {/* Step 2: Preview / Errors */}
        {step === 'preview' && validateResult && selectedFile && (
          <ImportPreviewStep
            selectedFile={selectedFile}
            validateResult={validateResult}
            isImportPending={importMutation.isPending}
            onReset={reset}
            onImport={() => importMutation.mutate(selectedFile)}
          />
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <ImportResultStep importResult={importResult} onReset={reset} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
