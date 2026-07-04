import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppNotification, NotificationListResult } from '@xcash/shared-types';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL, deleteApiData, getAccessToken, getApiData, patchApiData } from '@/lib/api';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.tenantId) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        // Chưa có token (vd. đang refresh) — thử lại sau
        reconnectTimer = setTimeout(connect, 3_000);
        return;
      }

      es = new EventSource(`${API_BASE_URL}/notifications/stream?token=${token}`);

      es.onmessage = () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      };

      es.onerror = () => {
        // Access token hết hạn (~15p) hoặc mất kết nối → đóng và tự mở lại
        // với token mới nhất (interceptor đã refresh vào storage).
        es?.close();
        es = null;
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5_000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [user?.tenantId, qc]);

  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => getApiData<NotificationListResult>('/notifications?limit=20'),
    enabled: !!user?.tenantId,
    // Giữ refetch 60s làm fallback phòng SSE disconnect
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchApiData<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => patchApiData<{ updated: number }>('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApiData<{ deleted: number }>(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Đã xóa thông báo');
    },
  });
}

export function useDeleteNotifications() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      deleteApiData<{ deleted: number }, { ids: string[] }>('/notifications', { ids }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Đã xóa ${result.deleted} thông báo`);
    },
  });
}

export function useDeleteAllNotifications() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteApiData<{ deleted: number }>('/notifications/all'),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Đã xóa tất cả ${result.deleted} thông báo`);
    },
  });
}
