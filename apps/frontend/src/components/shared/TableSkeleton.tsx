import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  const rowKeys = Array.from({ length: rows }, (_, index) => `row-${index}`);
  const columnKeys = Array.from({ length: columns }, (_, index) => `col-${index}`);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columnKeys.map((key) => (
            <TableHead key={key}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowKeys.map((rowKey) => (
          <TableRow key={rowKey}>
            {columnKeys.map((colKey) => (
              <TableCell key={`${rowKey}-${colKey}`}>
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
