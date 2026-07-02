import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BankStatusCard } from '@/components/dashboard/BankStatusCard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { getApiData } from '@/lib/api';

interface TransactionListResponse {
  items: Array<{
    id: string;
    transactionId: string;
    amount: string;
    content: string | null;
    status: string;
    transactionDate: string;
  }>;
  total: number;
}

export default function DashboardPage() {
  const { user, onboardingStatus } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => getApiData<TransactionListResponse>('/transactions?limit=5'),
    enabled: Boolean(onboardingStatus?.bankingLinked),
    refetchInterval: 10_000,
  });

  return (
    <>
      <Header title="Dashboard" description={`Xin chào, ${user?.name ?? 'bạn'}`} />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <BankStatusCard
            bankingLinked={Boolean(onboardingStatus?.bankingLinked)}
            grants={onboardingStatus?.grants ?? []}
          />

          <DashboardStatCard
            label="Tổng giao dịch"
            value={data?.total ?? 0}
            footer={
              <Button asChild size="sm" variant="ghost" className="h-auto px-0">
                <Link to="/transactions">
                  Xem giao dịch
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />

          <DashboardStatCard
            label="Gói dịch vụ"
            value="Free"
            footer={
              <p className="text-sm text-muted-foreground">Nâng cấp gói sẽ có ở Sprint sau</p>
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Giao dịch gần đây</CardTitle>
            <CardDescription>Danh sách 5 giao dịch mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !data?.items.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Chưa có giao dịch nào. Giao dịch sẽ xuất hiện sau khi Cas gửi webhook.
              </p>
            ) : (
              <div className="space-y-2">
                {data.items.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{txn.transactionId}</p>
                      <p className="text-xs text-muted-foreground">{txn.content ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{Number(txn.amount).toLocaleString('vi-VN')}đ</p>
                      <p className="text-xs text-muted-foreground">{txn.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
