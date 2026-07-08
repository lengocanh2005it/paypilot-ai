import { formatVND } from './format-vnd';

/** Tỷ giá quy đổi hiển thị USD → VND trên Partner console (ước tính, không phải tỷ giá thực). */
export const USD_TO_VND_RATE = 25_000;

export function formatUsdCost(value: number): string {
  if (value === 0) return '$0.00';
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

export function usdToVnd(usd: number): number {
  return Math.round(usd * USD_TO_VND_RATE);
}

/** Hiển thị USD kèm quy đổi VND cho partner VN. */
export function formatUsdWithVnd(usd: number): string {
  const vnd = usdToVnd(usd);
  if (usd === 0) return `${formatUsdCost(usd)} (~0đ)`;
  return `${formatUsdCost(usd)} (~${formatVND(vnd)})`;
}
