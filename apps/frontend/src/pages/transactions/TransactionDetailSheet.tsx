import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiData } from '@/lib/api';
import { formatCurrency, formatTransactionDateTime } from '@/lib/dashboard-transactions';
import type {
  MatchCandidate,
  TransactionDetail,
  TransactionMatchesResponse,
  TransactionSummary,
} from '@/types/transaction';

interface TransactionDetailSheetProps {
  transaction: TransactionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  const transactionId = transaction?.id;

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['transactions', transactionId, 'detail'],
    queryFn: () => getApiData<TransactionDetail>(`/transactions/${transactionId}`),
    enabled: open && Boolean(transactionId),
  });

  const { data: matches, isLoading: isMatchesLoading } = useQuery({
    queryKey: ['transactions', transactionId, 'matches'],
    queryFn: () => getApiData<TransactionMatchesResponse>(`/transactions/${transactionId}/matches`),
    enabled: open && Boolean(transactionId),
  });

  const displayTxn = detail ?? transaction;
  const topCandidates = (matches?.candidates ?? []).slice(0, 3);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Chi tiết giao dịch</SheetTitle>
          {displayTxn ? (
            <SheetDescription className="font-mono text-xs">
              {displayTxn.transactionId}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        {isDetailLoading && !displayTxn ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : displayTxn ? (
          <div className="space-y-6">
            <div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(Number(displayTxn.amount))}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTransactionDateTime(displayTxn.transactionDate)}
              </p>
              {displayTxn.senderAccount ? (
                <p className="mt-1 text-sm">{displayTxn.senderAccount}</p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium">Nội dung gốc</p>
              <p className="mt-1 rounded-lg border bg-muted/30 p-3 text-sm">
                {displayTxn.content ? `"${displayTxn.content}"` : '—'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-semibold">Gợi ý AI (top 3)</p>
              </div>

              {isMatchesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : topCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có gợi ý khớp. AI sẽ phân tích sau khi giao dịch được xử lý.
                </p>
              ) : (
                <div className="space-y-2">
                  {topCandidates.map((candidate) => (
                    <MatchSuggestionCard key={candidate.invoiceId} candidate={candidate} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-dashed bg-muted/20 p-3">
              <p className="text-sm font-medium">Giải thích AI</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tính năng giải thích chi tiết sẽ có ở Sprint sau khi API explanation sẵn sàng.
              </p>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MatchSuggestionCard({ candidate }: { candidate: MatchCandidate }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Hóa đơn #{candidate.invoiceCode}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {candidate.customerName} • {formatCurrency(candidate.amount)}
          </p>
        </div>
        <ConfidenceBadge score={candidate.confidenceScore} />
      </div>
    </div>
  );
}
