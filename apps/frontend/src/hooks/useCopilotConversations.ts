import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CopilotConversationDetail,
  CopilotConversationsListResponse,
} from '@xcash/shared-types';
import { useCallback } from 'react';
import { api } from '@/lib/api';

export function useCopilotConversations(userId?: string) {
  const qc = useQueryClient();

  const query = useQuery<CopilotConversationsListResponse>({
    queryKey: ['copilot-conversations', userId],
    queryFn: async () => {
      const res = await api.get<{ data: CopilotConversationsListResponse }>(
        '/ai/copilot/conversations',
      );
      return res.data.data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

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
    ...query,
    invalidateList,
    deleteConversation,
    renameConversation,
    loadConversation,
    loadOlderMessages,
  };
}
