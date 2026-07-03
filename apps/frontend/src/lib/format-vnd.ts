function formatCompactUnit(value: number, maxDecimals = 1): string {
  return Number(value.toFixed(maxDecimals)).toLocaleString('vi-VN', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });
}

/** Định dạng VND dễ đọc cho người Việt: tỷ / triệu / nghìn / đủ số. */
export function formatVND(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0đ';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return `${sign}${formatCompactUnit(abs / 1_000_000_000)} tỷ đ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${formatCompactUnit(abs / 1_000_000)} triệu đ`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatCompactUnit(abs / 1_000)} nghìn đ`;
  }
  return `${sign}${abs.toLocaleString('vi-VN')}đ`;
}

/** Nhãn ngắn cho trục biểu đồ. */
export function formatVNDAxis(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0';

  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return `${sign}${formatCompactUnit(abs / 1_000_000_000)} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${formatCompactUnit(abs / 1_000_000)} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatCompactUnit(abs / 1_000)} n`;
  }
  return `${sign}${abs.toLocaleString('vi-VN')}`;
}
