import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionStatusSlice } from '@/lib/dashboard-transactions';

interface TransactionStatusChartProps {
  data: TransactionStatusSlice[];
  isLoading?: boolean;
}

function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TransactionStatusSlice; value: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const slice = payload[0]?.payload;
  if (!slice) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{slice.label}</p>
      <p className="text-muted-foreground">{slice.value} giao dịch</p>
    </div>
  );
}

export function TransactionStatusChart({ data, isLoading }: TransactionStatusChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trạng thái định khoản</CardTitle>
        <CardDescription>Phân bổ giao dịch theo trạng thái xử lý</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="mx-auto size-[200px] rounded-full sm:size-[280px]" />
        ) : total === 0 ? (
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground sm:h-[300px]">
            Chưa có dữ liệu trạng thái giao dịch.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={3}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {data.map((slice) => (
                      <Cell key={slice.status} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border pt-4">
              {data.map((slice) => (
                <div key={slice.status} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-muted-foreground">{slice.label}</span>
                  <span className="font-medium tabular-nums">{slice.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
