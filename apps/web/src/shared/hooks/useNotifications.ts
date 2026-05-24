import { useCallback, useEffect, useState } from 'react';
import { apiFetch, NOTIFICATIONS_CHANGED_EVENT } from '@/shared/api/client';
import { canApprove, type AppRole } from '@/shared/auth/permissions';

export interface ApprovalNotification {
  id: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REASSIGN' | 'ASSIGNED';
  isRead: boolean;
  actedAt?: string | null;
  updatedAt: string;
  changeRequest: {
    id: string;
    title: string;
    priority: string;
    moduleAffected: string;
    organization: { name: string; code: string };
    requestedBy: { fullName: string };
  };
  actedBy?: { fullName: string } | null;
}

function notificationsEnabled(role: AppRole) {
  return canApprove(role) || role === 'CS_MEMBER';
}

export function useNotifications(role: AppRole) {
  const enabled = notificationsEnabled(role);
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const [list, count] = await Promise.all([
      apiFetch<{ notifications: ApprovalNotification[] }>('/notifications?limit=15'),
      apiFetch<{ count: number }>('/notifications/pending-count'),
    ]);
    setNotifications(list.notifications);
    setPendingCount(count.count);
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return;
    const interval = setInterval(refresh, 30000);
    const onChange = () => refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
    };
  }, [refresh, enabled]);

  const markRead = useCallback(
    async (id: string) => {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      await refresh();
    },
    [refresh],
  );

  return { notifications, pendingCount, refresh, markRead, enabled };
}
