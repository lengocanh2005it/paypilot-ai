import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface ImportUploadStepProps {
  isPending: boolean;
  onFileSelect: (file: File) => void;
}

async function downloadTemplate() {
  const response = await api.get('/transactions/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-nhap-giao-dich.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportUploadStep({ isPending, onFileSelect }: ImportUploadStepProps) {
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = '';
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Vùng kéo thả file"
        className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang đọc và kiểm tra file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <FileSpreadsheet className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Kéo thả file hoặc click chọn file</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Chỉ hỗ trợ .xlsx, tối đa 2MB, tối đa 500 dòng
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isPending}
            >
              <Upload className="mr-2 size-4" />
              Chọn file Excel
            </Button>
          </div>
        )}
        <input
          id="file-input"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleInputChange}
        />
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
        <p className="font-medium">Lưu ý quan trọng</p>
        <p className="mt-1">
          Không nhập các giao dịch đã có trong sao kê ngân hàng liên kết để tránh tính trùng.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => downloadTemplate().catch(() => toast.error('Không thể tải template'))}
        >
          Tải file Excel mẫu
        </button>
      </div>
    </div>
  );
}
