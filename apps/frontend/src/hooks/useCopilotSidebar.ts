import { useState } from 'react';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';

export function useCopilotSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyCollapsed, toggleHistoryCollapsed] = useSidebarCollapsed(
    'xcash_copilot_history_collapsed',
    true,
  );

  return {
    sidebarOpen,
    setSidebarOpen,
    historyCollapsed,
    toggleHistoryCollapsed,
  };
}
