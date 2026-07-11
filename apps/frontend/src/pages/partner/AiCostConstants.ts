import { Sparkles } from 'lucide-react';
import type { ElementType } from 'react';

export const CALL_TYPE_LABELS: Record<string, string> = {
  classify: 'Định khoản',
  copilot: 'Copilot',
  embedding: 'Embedding',
  title_gen: 'Tiêu đề',
};

export const CALL_TYPE_DESCRIPTIONS: Record<string, string> = {
  classify: 'Mỗi giao dịch được AI định khoản tự động (gpt-4o-mini)',
  copilot: 'Chat Copilot — có thể gồm nhiều tool call mỗi lượt',
  embedding: 'Vector hóa nội dung cho few-shot & knowledge base',
  title_gen: 'Tự sinh tiêu đề cuộc hội thoại Copilot',
};

export const CALL_TYPE_ICONS: Record<string, ElementType> = {
  classify: Sparkles,
  copilot: Sparkles,
  embedding: Sparkles,
  title_gen: Sparkles,
};

export const CALL_TYPE_COLORS: Record<string, string> = {
  classify: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  copilot: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  embedding: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  title_gen: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export const CALL_TYPE_ORDER = ['classify', 'copilot', 'embedding', 'title_gen'] as const;

export function getDefaultFromDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('vi-VN');
}
