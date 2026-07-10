import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDateTimeShort } from '@/lib/date';
import { formatUsdCost, formatUsdWithVnd, usdToVnd } from '@/lib/format-ai-cost';
import type { AiCostDetailResponse, AiCostRow } from '@/types/partner';
import { CALL_TYPE_COLORS, CALL_TYPE_LABELS } from './AiCostConstants';

interface AiCostDetailSheetProps {
  detailTenant: AiCostRow | null;
  onClose: () => void;
  filters: { fromDate: string; toDate: string };
}

export function AiCostDetailSheet({ detailTenant, onClose, filters }: AiCostDetailSheetProps) {
  const [detailCallType, setDetailCallType] = useState<string>('all');
  const [detailPage, setDetailPage] = useState(1);

  const { data: detail, isLoading: loadingDetail } = useQuery<AiCostDetailResponse>({
    queryKey: ['partner', 'ai-cost-detail', detailTenant?.tenantId, detailCallType, detailPage],
    queryFn: () =>
      api
        .get<{ data: AiCostDetailResponse }>('/partner/ai-costs/detail', {
          params: {
            tenantId: detailTenant!.tenantId,
            ...(detailCallType !== 'all' ? { callType: detailCallType } : {}),
            ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
            ...(filters.toDate ? { toDate: filters.toDate } : {}),
            page: detailPage,
            limit: 20,
          },
        })
        .then((r) => r.data.data),
    enabled: !!detailTenant,
    placeholderData: keepPreviousData,
  });

  return (
    <Sheet open={!!detailTenant} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle className="text-base">{detailTenant?.tenantName}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Chi tiết cuộc gọi AI · {formatUsdWithVnd(detailTenant?.totalCostUsd ?? 0)} tổng
          </p>
          <div className="mt-3">
            <Select
              value={detailCallType}
              onValueChange={(v) => {
                setDetailCallType(v);
                setDetailPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {Object.entries(CALL_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
          {loadingDetail ? (
            <div className="p-4">
              <TableSkeleton columns={7} rows={10} />
            </div>
          ) : !detail?.items.length ? (
            <div className="p-4">
              <EmptyState
                icon={Bot}
                title="Không có dữ liệu"
                description="Không có cuộc gọi AI nào cho bộ lọc này."
              />
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="space-y-2 p-4 lg:hidden">
                {detail.items.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${CALL_TYPE_COLORS[log.callType] ?? ''}`}
                      >
                        {CALL_TYPE_LABELS[log.callType] ?? log.callType}
                      </Badge>
                      <span className="text-xs font-medium tabular-nums">
                        {formatUsdCost(log.costUsd)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.model}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>In: {log.tokensIn.toLocaleString('vi-VN')}</span>
                      <span>Ra: {log.tokensOut.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {log.transactionId
                          ? `txn:${log.transactionId.slice(0, 8)}…`
                          : log.conversationId
                            ? `conv:${log.conversationId.slice(0, 8)}…`
                            : '—'}
                      </span>
                      <span>{formatDateTimeShort(log.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden p-4 lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Chi phí</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${CALL_TYPE_COLORS[log.callType] ?? ''}`}
                          >
                            {CALL_TYPE_LABELS[log.callType] ?? log.callType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.model}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {log.tokensIn.toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {log.tokensOut.toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          <div>{formatUsdCost(log.costUsd)}</div>
                          <div className="font-normal text-muted-foreground">
                            ~{usdToVnd(log.costUsd).toLocaleString('vi-VN')}đ
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[140px] text-xs text-muted-foreground">
                          {log.transactionId ? (
                            <span title={log.transactionId}>
                              txn:{log.transactionId.slice(0, 8)}…
                            </span>
                          ) : log.conversationId ? (
                            <span title={log.conversationId}>
                              conv:{log.conversationId.slice(0, 8)}…
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTimeShort(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {(detail?.totalPages ?? 0) > 1 ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
            <span className="text-sm text-muted-foreground">
              Trang {detailPage} / {detail!.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
              disabled={detailPage <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDetailPage((p) => Math.min(detail!.totalPages, p + 1))}
              disabled={detailPage >= detail!.totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
