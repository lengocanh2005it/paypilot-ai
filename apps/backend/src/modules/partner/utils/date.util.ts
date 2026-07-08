export function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function parseDateRange(
  fromDate?: string,
  toDate?: string,
): { start: Date; end: Date } | null {
  if (!fromDate && !toDate) return null;

  let start: Date | null = null;
  let end: Date | null = null;

  if (fromDate) {
    start = new Date(fromDate);
    if (Number.isNaN(start.getTime())) return null;
    start.setHours(0, 0, 0, 0);
  }
  if (toDate) {
    end = new Date(toDate);
    if (Number.isNaN(end.getTime())) return null;
    end.setHours(23, 59, 59, 999);
  }

  if (!start && end) {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  }
  if (start && !end) {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }
  if (!start || !end || start > end) return null;

  return { start, end };
}

export function buildMonthBuckets(
  rangeStart: Date,
  rangeEnd: Date,
): { start: Date; end: Date; label: string }[] {
  const buckets: { start: Date; end: Date; label: string }[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const lastMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (cursor <= lastMonth && buckets.length < 24) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    const effectiveEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    const effectiveStart = monthStart < rangeStart ? rangeStart : monthStart;
    buckets.push({
      start: effectiveStart,
      end: effectiveEnd,
      label: `${cursor.getMonth() + 1}/${cursor.getFullYear()}`,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return buckets;
}

/** Mặc định: tháng hiện tại. Có fromDate/toDate: lọc theo khoảng (end inclusive đến 23:59:59). */
export function resolveStatsPeriod(fromDate?: string, toDate?: string): { start: Date; end: Date } {
  const range = parseDateRange(fromDate, toDate);
  if (range) return range;

  const monthStart = getMonthStart();
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start: monthStart, end: monthEnd };
}

/** Mặc định: 6 tháng gần nhất. Có fromDate/toDate: bucket theo tháng trong khoảng (tối đa 24). */
export function resolveTrendMonths(
  fromDate?: string,
  toDate?: string,
): { start: Date; end: Date; label: string }[] {
  const range = parseDateRange(fromDate, toDate);
  if (range) return buildMonthBuckets(range.start, range.end);

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return buildMonthBuckets(start, end);
}

export function parseFilterStartDate(fromDate?: string): Date | undefined {
  if (!fromDate) return undefined;
  const start = new Date(fromDate);
  if (Number.isNaN(start.getTime())) return undefined;
  start.setHours(0, 0, 0, 0);
  return start;
}

export function parseFilterEndDate(toDate?: string): Date | undefined {
  if (!toDate) return undefined;
  const end = new Date(toDate);
  if (Number.isNaN(end.getTime())) return undefined;
  end.setHours(23, 59, 59, 999);
  return end;
}
