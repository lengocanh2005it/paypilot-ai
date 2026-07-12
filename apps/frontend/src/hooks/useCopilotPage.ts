import { useState } from 'react';
import { useAuthContext } from '@/contexts/auth-context';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { useCopilotConversationManager } from '@/hooks/useCopilotConversationManager';
import { useCopilotScroll } from '@/hooks/useCopilotScroll';
import { useCopilotSidebar } from '@/hooks/useCopilotSidebar';

export function useCopilotPage() {
  const { user } = useAuthContext();
  const sidebar = useCopilotSidebar();
  const conv = useCopilotConversationManager(user?.id);

  const {
    sendMessage: sendChatMessage,
    handleStop,
    isLoading,
    canAbort,
    streamActivity,
    streamingContent,
  } = useCopilotChat({
    activeConversationId: conv.activeConversationId,
    getMessages: conv.getMessages,
    addMessage: conv.addMessage,
    onConversationCreated: (id) => {
      conv.setActiveConversationId(id);
      // persist handled inside conversationManager
    },
    refreshListAfterChat: conv.refreshListAfterChat,
    invalidateList: conv.invalidateList,
  });

  const scroll = useCopilotScroll({
    messages: conv.messages,
    isLoading,
    isLoadingConversation: conv.isLoadingConversation,
    streamingContent,
    hasMoreMessages: conv.hasMoreMessages,
    isLoadingOlder: conv.isLoadingOlder,
    activeConversationId: conv.activeConversationId,
    oldestMessageId: conv.oldestMessageId,
    loadOlderMessages: conv.loadOlderMessages,
    onOlderMessagesLoaded: conv.handleOlderMessagesLoaded,
  });

  const [input, setInput] = useState('');

  const sendMessage = async (text: string) => {
    setInput('');
    await sendChatMessage(text);
  };

  const handleNewChat = () => {
    if (isLoading) handleStop();
    conv.handleNewChat();
    sidebar.setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    conv.handleSelectConversation(id, {
      isLoading,
      stopStream: handleStop,
      scrollToBottom: scroll.scrollToBottom,
    });
    sidebar.setSidebarOpen(false);
  };

  return {
    user,
    messages: conv.messages,
    input,
    setInput,
    isLoadingConversation: conv.isLoadingConversation,
    isLoadingOlder: conv.isLoadingOlder,
    hasMoreMessages: conv.hasMoreMessages,
    sidebarOpen: sidebar.sidebarOpen,
    setSidebarOpen: sidebar.setSidebarOpen,
    pendingDelete: conv.pendingDelete,
    setPendingDelete: conv.setPendingDelete,
    isDeletingConversation: conv.isDeletingConversation,
    historyCollapsed: sidebar.historyCollapsed,
    toggleHistoryCollapsed: sidebar.toggleHistoryCollapsed,
    activeConversationId: conv.activeConversationId,
    isWelcome: conv.messages.length === 0 && !isLoading && !conv.isLoadingConversation,
    isLoading,
    canAbort,
    streamActivity,
    streamingContent,
    bottomRef: scroll.bottomRef,
    chatContainerRef: scroll.chatContainerRef,
    sentinelRef: scroll.sentinelRef,
    sendMessage,
    handleStop,
    handleNewChat,
    handleSelectConversation,
    confirmDeleteConversation: conv.confirmDeleteConversation,
    invalidateList: conv.invalidateList,
  };
}
