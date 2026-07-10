import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'classified', label: 'Đã định khoản' },
  { value: 'review', label: 'Cần review' },
  { value: 'skipped', label: 'Bỏ qua' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'cas', label: 'Ngân hàng' },
  { value: 'import', label: 'Import Excel' },
];

interface TransactionFiltersProps {
  filters: {
    search: string;
    status: string;
    source: string;
    fromDate: string;
    toDate: string;
  };
  hasActiveFilters: boolean;
  isSearchPending: boolean;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function TransactionFilters({
  filters,
  hasActiveFilters,
  isSearchPending,
  onFilterChange,
  onClearFilters,
}: TransactionFiltersProps) {
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === filters.status)?.label;

  return (
    <Card className="py-4">
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="txn-search">Tìm nội dung</Label>
            <Input
              id="txn-search"
              placeholder="Tìm theo nội dung, mã GD, người gửi..."
              value={filters.search}
              onChange={(event) => onFilterChange('search', event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-status">Trạng thái</Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger id="txn-status" className="w-full">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value || 'all'} value={option.value || 'all'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-source">Nguồn</Label>
            <Select
              value={filters.source || 'all'}
              onValueChange={(value) => onFilterChange('source', value === 'all' ? '' : value)}
            >
              <SelectTrigger id="txn-source" className="w-full">
                <SelectValue placeholder="Tất cả nguồn" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value || 'all'} value={option.value || 'all'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="txn-from">Từ ngày</Label>
              <Input
                id="txn-from"
                type="date"
                value={filters.fromDate}
                onChange={(event) => onFilterChange('fromDate', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-to">Đến ngày</Label>
              <Input
                id="txn-to"
                type="date"
                value={filters.toDate}
                onChange={(event) => onFilterChange('toDate', event.target.value)}
              />
            </div>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Đang lọc:</span>
            {filters.status ? (
              <Badge variant="secondary">Trạng thái: {statusLabel ?? filters.status}</Badge>
            ) : null}
            {filters.source ? (
              <Badge variant="secondary">
                Nguồn: {filters.source === 'cas' ? 'Ngân hàng' : 'Import Excel'}
              </Badge>
            ) : null}
            {filters.fromDate ? <Badge variant="secondary">Từ {filters.fromDate}</Badge> : null}
            {filters.toDate ? <Badge variant="secondary">Đến {filters.toDate}</Badge> : null}
            {filters.search ? <Badge variant="secondary">"{filters.search}"</Badge> : null}
            {isSearchPending ? (
              <span className="text-xs text-muted-foreground">Đang tìm...</span>
            ) : null}
            <Button variant="link" size="sm" className="h-auto px-1" onClick={onClearFilters}>
              Xóa bộ lọc
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
