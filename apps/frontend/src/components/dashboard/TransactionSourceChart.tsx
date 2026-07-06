import { DashboardDonutChart } from '@/components/dashboard/DashboardDonutChart';
import type {
  mapSourceBreakdownResponse,
  SourceBreakdownApiResponse,
} from '@/lib/dashboard-transactions';

interface TransactionSourceChartProps {
  data: ReturnType<typeof mapSourceBreakdownResponse>;
  isLoading?: boolean;
}

export function TransactionSourceChart({ data, isLoading }: TransactionSourceChartProps) {
  return (
    <DashboardDonutChart
      title="Nguồn giao dịch"
      description="Ngân hàng (Cas) vs Import Excel"
      data={data}
      isLoading={isLoading}
      emptyMessage="Chưa có giao dịch trong hệ thống."
    />
  );
}

export type { SourceBreakdownApiResponse };
