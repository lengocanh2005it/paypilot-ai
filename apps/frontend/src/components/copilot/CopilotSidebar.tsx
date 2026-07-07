import { useQuery } from '@tanstack/react-query';
import type { CopilotConversationSummary } from '@xcash/shared-types';
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useCopilotConversations } from '@/hooks/useCopilotConversations';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PlanData {
  copilotQuota: number;
  copilotUsed: number;
}

interface Props {
  userId?: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupByDate(items: CopilotConversationSummary[]) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: { label: string; items: CopilotConversationSummary[] }[] = [];
  const buckets: Record<string, CopilotConversationSummary[]> = {
    'Hôm nay': [],
    'Hôm qua': [],
    '7 ngày qua': [],
    'Tháng này': [],
  };
  const olderBuckets: Map<string, CopilotConversationSummary[]> = new Map();

  for (const item of items) {
    const d = new Date(item.updatedAt);
    if (isSameDay(d, now)) {
      buckets['Hôm nay'].push(item);
    } else if (isSameDay(d, yesterday)) {
      buckets['Hôm qua'].push(item);
    } else if (d >= sevenDaysAgo) {
      buckets['7 ngày qua'].push(item);
    } else if (d >= monthStart) {
      buckets['Tháng này'].push(item);
    } else {
      const key = toDateKey(d);
      const existing = olderBuckets.get(key) ?? [];
      existing.push(item);
      olderBuckets.set(key, existing);
    }
  }

  for (const [label, list] of Object.entries(buckets)) {
    if (list.length > 0) groups.push({ label, items: list });
  }
  for (const [key, list] of olderBuckets.entries()) {
    const d = new Date(`${key}-01`);
    groups.push({ label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`, items: list });
  }

  return groups;
}

function ConversationItem({
  item,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  item: CopilotConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== item.title) onRename(trimmed);
    setRenaming(false);
  };

  return (
    <div
      className={cn(
        'group relative flex items-center rounded-lg text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
      )}
    >
      {renaming ? (
        <div className="flex-1 px-3 py-2">
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            className="w-full bg-transparent text-sm outline-none border-b border-primary"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 truncate text-left px-3 py-2 text-foreground/80"
        >
          {item.title}
        </button>
      )}

      <div className="relative shrink-0 pr-1" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            'flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-opacity',
            menuOpen || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          aria-label="Tùy chọn"
        >
          <MoreHorizontal className="size-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 min-w-[140px] rounded-lg border border-border bg-popover shadow-md py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setRenaming(true);
                setRenameValue(item.title);
              }}
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              Đổi tên
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
              Xóa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CopilotSidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: Props) {
  const { data, deleteConversation, renameConversation } = useCopilotConversations(userId);
  const [deleteTarget, setDeleteTarget] = useState<CopilotConversationSummary | null>(null);

  const { data: planData } = useQuery<PlanData>({
    queryKey: ['billing', 'current-plan'],
    queryFn: () => api.get<{ data: PlanData }>('/billing/current-plan').then((r) => r.data.data),
    staleTime: 60_000,
    select: (d) => ({ copilotQuota: d.copilotQuota, copilotUsed: d.copilotUsed }),
  });

  const groups = groupByDate(data?.items ?? []);
  const quota = planData?.copilotQuota ?? 0;
  const used = planData?.copilotUsed ?? 0;
  const isUnlimited = quota === -1;
  const pct = isUnlimited ? 0 : quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 100;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteConversation(deleteTarget.id);
    if (deleteTarget.id === activeConversationId) onDeleteConversation(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* New chat button */}
      <div className="p-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <MessageSquarePlus className="size-4" />
          Chat mới
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Chưa có cuộc chat nào
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            {group.items.map((item) => (
              <ConversationItem
                key={item.id}
                item={item}
                isActive={item.id === activeConversationId}
                onSelect={() => onSelectConversation(item.id)}
                onRename={(title) => renameConversation(item.id, title)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Usage bar */}
      {!isUnlimited && quota > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Lượt chat Copilot</span>
            <span
              className={cn(pct >= 100 ? 'text-destructive' : pct >= 80 ? 'text-orange-500' : '')}
            >
              {used}/{quota}
            </span>
          </div>
          <Progress
            value={pct}
            className={cn(
              'h-1.5',
              pct >= 100 ? '[&>div]:bg-destructive' : pct >= 80 ? '[&>div]:bg-orange-500' : '',
            )}
          />
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa cuộc trò chuyện?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cuộc chat <span className="font-medium text-foreground">"{deleteTarget?.title}"</span>{' '}
            và toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
