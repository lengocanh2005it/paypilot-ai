import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiData } from '@/lib/api';

interface TransactionListResponse {
  items: Array<{
    id: string;
    transactionId: string;
    amount: string;
    content: string | null;
    senderAccount: string | null;
    status: string;
    transactionDate: string;
  }>;
  page: number;
  limit: number;
  total: number;
}

export default function TransactionsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getApiData<TransactionListResponse>('/transactions?limit=20'),
    refetchInterval: 10_000,
  });

  return (
    <>
      <Header
        title="Giao dịch"
        description="Danh sách giao dịch ngân hàng nhận qua Cas Balance Hook"
        actions={
          <Button variant="link" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-2">
            {['a', 'b', 'c', 'd', 'e'].map((key) => (
              <Skeleton key={key} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5 py-6">
            <CardContent className="text-center">
              <p className="text-sm text-destructive">Không thể tải danh sách giao dịch</p>
              <Button variant="link" size="sm" className="mt-3" onClick={() => refetch()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : !data?.items.length ? (
          <Card className="border-dashed py-8 sm:py-10">
            <CardContent className="text-center">
              <p className="text-sm font-medium">Chưa có giao dịch nào</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Giao dịch sẽ xuất hiện khi Cas gửi webhook sau khi liên kết ngân hàng.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {data.items.map((txn) => (
                <Card key={txn.id} className="py-4">
                  <CardContent className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-xs text-muted-foreground">{txn.transactionId}</p>
                      <Badge variant="secondary">{txn.status}</Badge>
                    </div>
                    <p className="mt-2 font-semibold text-primary">
                      {Number(txn.amount).toLocaleString('vi-VN')}đ
                    </p>
                    <p className="mt-1 text-muted-foreground">{txn.content ?? '—'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {txn.senderAccount ?? 'Không rõ người gửi'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã GD</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead>Người gửi</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-xs">{txn.transactionId}</TableCell>
                      <TableCell className="max-w-xs truncate">{txn.content ?? '—'}</TableCell>
                      <TableCell>{txn.senderAccount ?? '—'}</TableCell>
                      <TableCell className="font-medium text-primary">
                        {Number(txn.amount).toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{txn.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
