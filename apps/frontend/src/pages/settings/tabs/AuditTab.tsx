import { ScrollText } from 'lucide-react';
import { AuditLogPanel } from '@/components/audit/AuditLogPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuditTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="size-4" />
          Nhật ký hoạt động
        </CardTitle>
        <CardDescription>
          Lịch sử thao tác trong doanh nghiệp — định khoản, liên kết ngân hàng, thanh toán...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuditLogPanel endpoint="/audit-logs" />
      </CardContent>
    </Card>
  );
}
