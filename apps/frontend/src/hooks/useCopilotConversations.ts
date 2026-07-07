import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CopilotConversationDetail,
  CopilotConversationsListResponse,
} from '@xcash/shared-types';
import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api';

export function useCopilotConversations(userId?: string) {
  const qc = useQueryClient();

  const infiniteQuery = useInfiniteQuery<CopilotConversationsListResponse>({
    queryKey: ['copilot-conversations', userId],
    queryFn: async ({ pageParam }) => {
      const before = pageParam as string | undefined;
      const url = before
        ? `/ai/copilot/conversations?before=${before}`
        : '/ai/copilot/conversations';
      const res = await api.get<{ data: CopilotConversationsListResponse }>(url);
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.cursorNext ? lastPage.cursorNext : undefined,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const items = useMemo(
    () => infiniteQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [infiniteQuery.data],
  );

  const invalidateList = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['copilot-conversations', userId] });
  }, [qc, userId]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await api.delete(`/ai/copilot/conversations/${id}`);
      qc.invalidateQueries({ queryKey: ['copilot-conversations', userId] });
    },
    [qc, userId],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await api.patch(`/ai/copilot/conversations/${id}`, { title });
      qc.invalidateQueries({ queryKey: ['copilot-conversations', userId] });
    },
    [qc, userId],
  );

  const loadConversation = useCallback(async (id: string): Promise<CopilotConversationDetail> => {
    const res = await api.get<{ data: CopilotConversationDetail }>(
      `/ai/copilot/conversations/${id}`,
    );
    return res.data.data;
  }, []);

  const loadOlderMessages = useCallback(
    async (id: string, before: string): Promise<CopilotConversationDetail> => {
      const res = await api.get<{ data: CopilotConversationDetail }>(
        `/ai/copilot/conversations/${id}?before=${before}`,
      );
      return res.data.data;
    },
    [],
  );

  return {
    ...infiniteQuery,
    items,
    invalidateList,
    deleteConversation,
    renameConversation,
    loadConversation,
    loadOlderMessages,
  };
}
