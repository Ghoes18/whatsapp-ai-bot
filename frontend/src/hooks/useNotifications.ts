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
      
      // Calcular total de mensagens não lidas somando todas as contagens por cliente
      const totalUnreadMessages = Object.values(unreadCounts).reduce((sum: number, count: number) => sum + count, 0);
      
      setNotifications({
        unreadMessages: totalUnreadMessages, // Usar contagem real de mensagens não lidas
        pendingPlans: stats.pendingPlans,
        clientUnreadCounts: unreadCounts,
      });
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
    }
  }, []);

  // Atualizar notificações a cada 10 segundos (reduzido de 30)
  useEffect(() => {
    updateNotifications();
    const interval = setInterval(updateNotifications, 10000);
    return () => clearInterval(interval);
  }, [updateNotifications]);

  return {
    notifications,
    updateNotifications,
    forceUpdate: updateNotifications, // Alias para forçar atualização
  };
} 