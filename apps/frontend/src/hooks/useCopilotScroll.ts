import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Message } from '@/hooks/useCopilotChat';

interface UseCopilotScrollOptions {
  messages: Message[];
  isLoading: boolean;
  isLoadingConversation: boolean;
  streamingContent: string;
  hasMoreMessages: boolean;
  isLoadingOlder: boolean;
  activeConversationId: string | null;
  oldestMessageId: string | null;
  loadOlderMessages: (
    convId: string,
    before: string,
  ) => Promise<{
    messages: Array<{
      id: string;
      role: string;
      content: string;
      activities?: unknown[];
      isPartial?: boolean;
    }>;
    hasMore: boolean;
    oldestMessageId: string | null;
  }>;
  onOlderMessagesLoaded: (
    messages: Message[],
    hasMore: boolean,
    oldestMessageId: string | null,
  ) => void;
}

export function useCopilotScroll({
  messages,
  isLoading,
  isLoadingConversation,
  streamingContent,
  hasMoreMessages,
  isLoadingOlder,
  activeConversationId,
  oldestMessageId,
  loadOlderMessages,
  onOlderMessagesLoaded,
}: UseCopilotScrollOptions) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const [justPrepended, setJustPrepended] = useState(false);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  };

  async function handleLoadOlderMessages() {
    if (!hasMoreMessages || isLoadingOlder || !activeConversationId || !oldestMessageId) return;
    if (chatContainerRef.current) {
      prevScrollHeightRef.current = chatContainerRef.current.scrollHeight;
    }
    const conv = await loadOlderMessages(activeConversationId, oldestMessageId);
    const mapped = conv.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      activities: m.activities as
        | import('@/components/copilot/CopilotSourceChips').CopilotActivity[]
        | undefined,
      isPartial: m.isPartial,
    }));
    onOlderMessagesLoaded(mapped, conv.hasMore, conv.oldestMessageId);
    setJustPrepended(true);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages needed to recalc scroll position
  useLayoutEffect(() => {
    if (justPrepended && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
      setJustPrepended(false);
    }
  }, [justPrepended, messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional deps
  useEffect(() => {
    if (!hasMoreMessages || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadOlderMessages();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingOlder, activeConversationId, oldestMessageId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
  useEffect(() => {
    if (!justPrepended && !isLoadingConversation) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, streamingContent, isLoadingConversation]);

  return {
    bottomRef,
    chatContainerRef,
    sentinelRef,
    scrollToBottom,
  };
}
