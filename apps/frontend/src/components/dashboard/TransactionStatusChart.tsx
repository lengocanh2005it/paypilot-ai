import { DashboardDonutChart } from '@/components/dashboard/DashboardDonutChart';

interface TransactionStatusChartProps {
  data: Array<{ status: string; label: string; value: number; color: string }>;
  isLoading?: boolean;
}

export function TransactionStatusChart({ data, isLoading }: TransactionStatusChartProps) {
  const donutData = data.map((slice) => ({
    id: slice.status,
    label: slice.label,
    value: slice.value,
    color: slice.color,
  }));

  return (
    <DashboardDonutChart
      title="Trạng thái định khoản"
      description="Phân bổ theo bước xử lý AI"
      data={donutData}
      isLoading={isLoading}
      emptyMessage="Chưa có dữ liệu trạng thái giao dịch."
    />
  );
}
