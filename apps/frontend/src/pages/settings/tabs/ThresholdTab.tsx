import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { isAdmin } from '@/lib/rbac';

export function ThresholdTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const readOnly = !isAdmin(user?.role);
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'threshold'],
    queryFn: () =>
      api.get<{ data: { threshold: number } }>('/settings/threshold').then((r) => r.data.data),
  });

  const [local, setLocal] = useState<number | null>(null);
  const threshold = local ?? data?.threshold ?? 85;

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.put('/settings/threshold', { threshold }),
    onSuccess: () => {
      toast.success('Đã lưu ngưỡng confidence');
      qc.invalidateQueries({ queryKey: ['settings', 'threshold'] });
    },
    onError: () => toast.error('Không thể lưu, vui lòng thử lại'),
  });

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ngưỡng tự động định khoản</CardTitle>
        <CardDescription>
          Giao dịch có confidence ≥ ngưỡng này sẽ được định khoản tự động. Dưới ngưỡng → chuyển
          Human Review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Label htmlFor="threshold-slider" className="sr-only">
            Ngưỡng tự động định khoản
          </Label>
          <input
            id="threshold-slider"
            type="range"
            min={50}
            max={99}
            step={1}
            value={threshold}
            onChange={(e) => setLocal(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-valuemin={50}
            aria-valuemax={99}
            aria-valuenow={threshold}
            aria-describedby="threshold-hint"
            disabled={readOnly}
          />
          <span className="w-16 text-center text-2xl font-bold text-primary">{threshold}%</span>
        </div>
        <p id="threshold-hint" className="text-xs text-muted-foreground">
          Mặc định: 85% — Khuyến nghị giữ trong khoảng 80–95%
          {readOnly ? ' Chỉ Admin mới có thể thay đổi ngưỡng này.' : null}
        </p>
        {!readOnly ? (
          <Button onClick={() => save()} disabled={isPending}>
            Lưu thay đổi
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
