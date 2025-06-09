import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

interface NotificationState {
  unreadMessages: number;
  pendingPlans: number;
  clientUnreadCounts: { [clientId: string]: number };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationState>({
    unreadMessages: 0,
    pendingPlans: 0,
    clientUnreadCounts: {},
  });

  const updateNotifications = useCallback(async () => {
    try {
      // Buscar estatísticas do dashboard e contagens de mensagens não lidas em uma única chamada
      const [stats, unreadCounts] = await Promise.all([
        dashboardAPI.getDashboardStats(),
        dashboardAPI.getUnreadMessageCounts()
      ]);
      
      setNotifications({
        unreadMessages: stats.activeConversations,
        pendingPlans: stats.pendingPlans,
        clientUnreadCounts: unreadCounts,
      });
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
    }
  }, []);

  // Atualizar notificações a cada 30 segundos
  useEffect(() => {
    updateNotifications();
    const interval = setInterval(updateNotifications, 30000);
    return () => clearInterval(interval);
  }, [updateNotifications]);

  return {
    notifications,
    updateNotifications,
  };
} 