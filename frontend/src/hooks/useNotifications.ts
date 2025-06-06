import { useState, useEffect } from 'react';
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

  const updateNotifications = async () => {
    try {
      // Buscar estatísticas do dashboard
      const stats = await dashboardAPI.getDashboardStats();
      
      // Buscar clientes com mensagens não lidas
      const clients = await dashboardAPI.getClients();
      const clientUnreadCounts: { [clientId: string]: number } = {};
      
      // Para cada cliente, buscar mensagens não lidas
      await Promise.all(
        clients.map(async (client) => {
          const messages = await dashboardAPI.getMessages(client.id);
          const unreadCount = messages.filter(
            (msg) => msg.role === 'user' && !msg.read
          ).length;
          if (unreadCount > 0) {
            clientUnreadCounts[client.id] = unreadCount;
          }
        })
      );

      setNotifications({
        unreadMessages: stats.activeConversations,
        pendingPlans: stats.pendingPlans,
        clientUnreadCounts,
      });
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
    }
  };

  // Atualizar notificações a cada 30 segundos
  useEffect(() => {
    updateNotifications();
    const interval = setInterval(updateNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    updateNotifications,
  };
} 