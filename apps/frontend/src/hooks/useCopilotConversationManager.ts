import type { CopilotConversationSummary } from '@xcash/shared-types';
import { useCallback, useEffect, useState } from 'react';
import type { Message } from '@/hooks/useCopilotChat';
import { useCopilotConversations } from '@/hooks/useCopilotConversations';

function mapDto(m: {
  id: string;
  role: string;
  content: string;
  activities?: unknown[];
  isPartial?: boolean;
}) {
  return {
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    activities: m.activities as
      | import('@/components/copilot/CopilotSourceChips').CopilotActivity[]
      | undefined,
    isPartial: m.isPartial,
  };
}

export function useCopilotConversationManager(userId: string | undefined) {
  const {
    invalidateList,
    loadConversation,
    loadOlderMessages,
    refreshListAfterChat,
    deleteConversation,
  } = useCopilotConversations(userId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (!userId) return null;
    return localStorage.getItem(`xcash_copilot_conv_${userId}`) ?? null;
  });
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CopilotConversationSummary | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const persistConversation = useCallback(
    (id: string | null) => {
      if (!userId) return;
      if (id) localStorage.setItem(`xcash_copilot_conv_${userId}`, id);
      else localStorage.removeItem(`xcash_copilot_conv_${userId}`);
    },
    [userId],
  );

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const getMessages = useCallback(() => messages, [messages]);

  const handleLoadConversation = useCallback(
    async (id: string, opts?: { showLoading?: boolean; scrollToBottom?: () => void }) => {
      const showLoading = opts?.showLoading ?? true;
      if (showLoading) setIsLoadingConversation(true);
      try {
        const conv = await loadConversation(id);
        setMessages(conv.messages.map(mapDto));
        setHasMoreMessages(conv.hasMore);
        setOldestMessageId(conv.oldestMessageId);
        setActiveConversationId(id);
        persistConversation(id);
        opts?.scrollToBottom?.();
      } catch {
        setMessages([]);
        setActiveConversationId(null);
        persistConversation(null);
      } finally {
        if (showLoading) setIsLoadingConversation(false);
      }
    },
    [loadConversation, persistConversation],
  );

  const handleOlderMessagesLoaded = useCallback(
    (newMessages: Message[], hasMore: boolean, newOldestId: string | null) => {
      setMessages((prev) => [...newMessages, ...prev]);
      setHasMoreMessages(hasMore);
      setOldestMessageId(newOldestId);
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: run only on mount
  useEffect(() => {
    if (activeConversationId) {
      handleLoadConversation(activeConversationId);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    persistConversation(null);
    setHasMoreMessages(false);
    setOldestMessageId(null);
  }, [persistConversation]);

  const handleSelectConversation = useCallback(
    (
      id: string,
      opts?: { isLoading?: boolean; stopStream?: () => void; scrollToBottom?: () => void },
    ) => {
      if (id === activeConversationId && !isLoadingConversation) return;
      if (opts?.isLoading) opts.stopStream?.();
      setIsLoadingConversation(true);
      setMessages([]);
      setHasMoreMessages(false);
      setOldestMessageId(null);
      void handleLoadConversation(id, { showLoading: false, scrollToBottom: opts?.scrollToBottom });
    },
    [activeConversationId, isLoadingConversation, handleLoadConversation],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) {
        setMessages([]);
        setActiveConversationId(null);
        persistConversation(null);
      }
    },
    [activeConversationId, persistConversation],
  );

  const confirmDeleteConversation = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeletingConversation(true);
    try {
      await deleteConversation(pendingDelete.id);
      handleDeleteConversation(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setIsDeletingConversation(false);
    }
  }, [pendingDelete, deleteConversation, handleDeleteConversation]);

  return {
    messages,
    activeConversationId,
    setActiveConversationId,
    isWelcome: messages.length === 0,
    isLoadingConversation,
    isLoadingOlder,
    setIsLoadingOlder,
    hasMoreMessages,
    oldestMessageId,
    pendingDelete,
    setPendingDelete,
    isDeletingConversation,
    addMessage,
    getMessages,
    loadOlderMessages,
    handleLoadConversation,
    handleOlderMessagesLoaded,
    handleNewChat,
    handleSelectConversation,
    confirmDeleteConversation,
    invalidateList,
    refreshListAfterChat,
  };
}
