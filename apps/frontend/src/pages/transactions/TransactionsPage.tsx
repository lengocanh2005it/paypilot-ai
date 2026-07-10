import { FileSpreadsheet, Receipt } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { TransactionSourceBadge } from '@/components/shared/TransactionSourceBadge';
import { TransactionStatusBadge } from '@/components/shared/TransactionStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTransactionsList } from '@/hooks/useTransactionsList';
import { formatTransactionTime } from '@/lib/date';
import { formatSignedTransactionAmount } from '@/lib/transaction-format';
import { ImportTransactionsDialog } from './ImportTransactionsDialog';
import { TransactionBulkBar } from './TransactionBulkBar';
import { TransactionDetailSheet } from './TransactionDetailSheet';
import { TransactionFilters } from './TransactionFilters';

export default function TransactionsPage() {
  const {
    items,
    data,
    totalPages,
    filters,
    debouncedFilters,
    setFilter,
    page,
    setPage,
    isLoading,
    isError,
    isFetching,
    refetch,
    hasActiveFilters,
    canBulkReclassify,
    canImport,
    selectedIds,
    pendingOnPage,
    selectedPendingCount,
    allPendingOnPageSelected,
    bulkReclassifyMutation,
    toggleSelection,
    toggleSelectAllPendingOnPage,
    handleBulkReclassify,
    importDialogOpen,
    setImportDialogOpen,
    selectedTxn,
    sheetOpen,
    setSheetOpen,
    bulkConfirmOpen,
    setBulkConfirmOpen,
    openDetail,
    clearFilters,
  } = useTransactionsList();

  const isSearchPending = filters.search !== debouncedFilters.search;

  return (
    <>
      <Header
        title="Giao dịch"
        description="Danh sách giao dịch ngân hàng nhận qua Cas Balance Hook"
        actions={
          <div className="flex items-center gap-2">
            {canImport && (
              <Button size="sm" onClick={() => setImportDialogOpen(true)}>
                <FileSpreadsheet className="mr-2 size-4" />
                Nhập từ Excel
              </Button>
            )}
            <Button variant="link" size="sm" onClick={() => refetch()} disabled={isFetching}>
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        <TransactionFilters
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          isSearchPending={isSearchPending}
          onFilterChange={(key, value) => setFilter(key as never, value as never)}
          onClearFilters={clearFilters}
        />

        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5 py-6">
            <CardContent className="text-center">
              <p className="text-sm text-destructive">Không thể tải danh sách giao dịch</p>
              <Button variant="link" size="sm" className="mt-3" onClick={() => refetch()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : !items.length ? (
          <Card className="py-4">
            <CardContent>
              <EmptyState
                className="border-0 bg-transparent py-6"
                icon={Receipt}
                title="Không tìm thấy giao dịch nào"
                description={
                  hasActiveFilters
                    ? 'Thử đổi bộ lọc hoặc xóa điều kiện tìm kiếm.'
                    : 'Giao dịch sẽ xuất hiện khi Cas gửi webhook sau khi liên kết ngân hàng.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {canBulkReclassify && selectedIds.size > 0 ? (
              <TransactionBulkBar
                selectedCount={selectedIds.size}
                selectedPendingCount={selectedPendingCount}
                isPending={bulkReclassifyMutation.isPending}
                onClearSelection={() => {}}
                onBulkReclassify={() => setBulkConfirmOpen(true)}
              />
            ) : null}

            <div className="space-y-3 md:hidden">
              {items.map((txn) => {
                const selectable = canBulkReclassify && txn.status === 'pending';
                const checked = selectedIds.has(txn.id);

                return (
                  <Card key={txn.id} className="py-4 transition-colors hover:bg-muted/30">
                    <CardContent className="text-sm">
                      <div className="flex items-start gap-3">
                        {canBulkReclassify ? (
                          <Checkbox
                            checked={checked}
                            disabled={!selectable}
                            onCheckedChange={(value) => toggleSelection(txn, value === true)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Chọn giao dịch ${txn.transactionId}`}
                            className="mt-0.5"
                          />
                        ) : null}
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => openDetail(txn)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-xs text-muted-foreground">
                                {formatTransactionTime(txn.transactionDate)}
                              </p>
                              <TransactionSourceBadge source={txn.source} />
                            </div>
                            <TransactionStatusBadge status={txn.status} />
                          </div>
                          <p className="mt-2 font-semibold">
                            <span>{formatSignedTransactionAmount(Number(txn.amount))}</span>
                          </p>
                          <p className="mt-1 text-muted-foreground">{txn.content ?? '—'}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {txn.senderAccount ?? 'Không rõ người gửi'}
                            </p>
                            <ConfidenceBadge
                              score={txn.classification?.confidenceScore ?? txn.confidenceScore}
                            />
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="hidden overflow-hidden py-0 md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    {canBulkReclassify ? (
                      <TableHead className="w-10 py-3">
                        <Checkbox
                          checked={allPendingOnPageSelected}
                          disabled={pendingOnPage.length === 0}
                          onCheckedChange={(value) => toggleSelectAllPendingOnPage(value === true)}
                          aria-label="Chọn tất cả giao dịch chờ xử lý trên trang"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="py-3">Thời gian</TableHead>
                    <TableHead className="py-3">Nguồn</TableHead>
                    <TableHead className="py-3 text-right">Số tiền</TableHead>
                    <TableHead className="py-3">Nội dung</TableHead>
                    <TableHead className="py-3">Người gửi</TableHead>
                    <TableHead className="py-3 text-center">TK Nợ/Có</TableHead>
                    <TableHead className="py-3 text-center">Độ tin cậy</TableHead>
                    <TableHead className="py-3 text-right">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((txn) => {
                    const selectable = canBulkReclassify && txn.status === 'pending';
                    const checked = selectedIds.has(txn.id);

                    return (
                      <TableRow key={txn.id} className="cursor-pointer">
                        {canBulkReclassify ? (
                          <TableCell className="w-10" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={checked}
                              disabled={!selectable}
                              onCheckedChange={(value) => toggleSelection(txn, value === true)}
                              aria-label={`Chọn giao dịch ${txn.transactionId}`}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell
                          className="text-sm text-muted-foreground whitespace-nowrap"
                          onClick={() => openDetail(txn)}
                        >
                          {formatTransactionTime(txn.transactionDate)}
                        </TableCell>
                        <TableCell onClick={() => openDetail(txn)}>
                          <TransactionSourceBadge source={txn.source} />
                        </TableCell>
                        <TableCell
                          className="text-right font-semibold"
                          onClick={() => openDetail(txn)}
                        >
                          {formatSignedTransactionAmount(Number(txn.amount))}
                        </TableCell>
                        <TableCell
                          className="max-w-[260px] truncate text-sm"
                          onClick={() => openDetail(txn)}
                        >
                          {txn.content ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm" onClick={() => openDetail(txn)}>
                          {txn.senderAccount ?? '—'}
                        </TableCell>
                        <TableCell
                          className="text-center font-mono text-xs"
                          onClick={() => openDetail(txn)}
                        >
                          {txn.classification ? (
                            <span>
                              {txn.classification.debitAccount}/{txn.classification.creditAccount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={() => openDetail(txn)}>
                          <ConfidenceBadge
                            score={txn.classification?.confidenceScore ?? txn.confidenceScore}
                          />
                        </TableCell>
                        <TableCell className="text-right" onClick={() => openDetail(txn)}>
                          <div className="flex justify-end">
                            <TransactionStatusBadge status={txn.status} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {data ? (
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Hiển thị {items.length} / {data.total} giao dịch
                </p>
                {data.total > 20 ? (
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <TransactionDetailSheet
        transaction={selectedTxn}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <ImportTransactionsDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) refetch();
        }}
        onImported={() => {
          setFilter('source', 'import');
        }}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Định khoản lại hàng loạt?"
        description={`Gửi ${selectedPendingCount} giao dịch đang chờ xử lý cho AI định khoản lại. Thao tác này có thể mất vài phút tùy số lượng.`}
        confirmLabel="Gửi cho AI"
        loading={bulkReclassifyMutation.isPending}
        onConfirm={handleBulkReclassify}
      />
    </>
  );
}
