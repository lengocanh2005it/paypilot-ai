import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

export function BankingTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: () =>
      api
        .get<{
          data: {
            grants: Array<{
              id: string;
              bankName: string | null;
              accountNumber: string | null;
              accountHolderName: string | null;
              bankLogo: string | null;
            }>;
          };
        }>('/onboarding/status')
        .then((r) => r.data.data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tài khoản ngân hàng</CardTitle>
        <CardDescription>
          Tài khoản đã liên kết qua Cas Link để nhận giao dịch real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }, (_, i) => `skel-${i}`).map((k) => (
              <Skeleton key={k} className="h-14" />
            ))}
          </div>
        ) : !data?.grants?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Chưa liên kết tài khoản ngân hàng nào.
          </p>
        ) : (
          <div className="space-y-2">
            {data.grants.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border p-3">
                {g.bankLogo ? (
                  <img
                    src={g.bankLogo}
                    alt={g.bankName ?? ''}
                    className="size-8 rounded object-contain"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded bg-muted">
                    <Building2 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.bankName ?? 'Ngân hàng'}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.accountNumber} {g.accountHolderName ? `• ${g.accountHolderName}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Đã liên kết
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
