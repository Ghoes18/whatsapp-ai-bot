import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import { realtimeService, type RealtimeMessage } from '../services/supabaseClient';

interface NotificationState {
  unreadMessages: number | undefined;
  pendingPlans: number | undefined;
  humanSupportRequests: number | undefined;
  clientUnreadCounts: { [clientId: string]: number };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationState>({
    unreadMessages: undefined,
    pendingPlans: undefined,
    humanSupportRequests: undefined,
    clientUnreadCounts: {},
  });

  const isInitializedRef = useRef(false);

  const updateNotifications = useCallback(async () => {
    try {
      // Buscar estatísticas do dashboard, contagens de mensagens não lidas e solicitações de suporte humano
      const [stats, unreadCounts, humanSupportCount] = await Promise.all([
        dashboardAPI.getDashboardStats(),
        dashboardAPI.getUnreadMessageCounts(),
        dashboardAPI.getHumanSupportRequestsCount()
      ]);
      
      // Calcular total de mensagens não lidas somando todas as contagens por cliente
      const totalUnreadMessages = Object.values(unreadCounts).reduce((sum: number, count: number) => sum + count, 0);
      
      setNotifications({
        unreadMessages: totalUnreadMessages, // Usar contagem real de mensagens não lidas
        pendingPlans: stats.pendingPlans,
        humanSupportRequests: humanSupportCount.count,
        clientUnreadCounts: unreadCounts,
      });
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
      // Em caso de erro, definir como 0 para não mostrar badges falsas
      setNotifications(prev => ({
        ...prev,
        unreadMessages: 0,
        pendingPlans: 0,
        humanSupportRequests: 0,
      }));
    }
  }, []);

  // Handler para novas mensagens em tempo real
  const handleNewMessage = useCallback((message: RealtimeMessage) => {
    // Só contar se a mensagem for do usuário (não do assistente) e não estiver lida
    if (message.role === 'user' && !message.read) {
      console.log('📬 Nova mensagem não lida detectada via Realtime:', message);
      
      setNotifications(prev => ({
        ...prev,
        unreadMessages: (prev.unreadMessages || 0) + 1,
        clientUnreadCounts: {
          ...prev.clientUnreadCounts,
          [message.client_id]: (prev.clientUnreadCounts[message.client_id] || 0) + 1
        }
      }));
    }
  }, []);

  // Inicializar notificações e Realtime
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    console.log('🔔 Inicializando sistema de notificações com Realtime');
    
    // Carregar estado inicial
    updateNotifications();
    
    // Aguardar um pouco antes de configurar Realtime para evitar problemas com Strict Mode
    const realtimeTimeout = setTimeout(() => {
      realtimeService.subscribeToAllMessages(handleNewMessage);
    }, 100);
    
    // Backup: polling a cada 30 segundos para garantir sincronização
    const interval = setInterval(updateNotifications, 30000);
    
    isInitializedRef.current = true;
    
    return () => {
      console.log('🔕 Limpando sistema de notificações');
      clearTimeout(realtimeTimeout);
      clearInterval(interval);
      // Aguardar um pouco antes de fazer unsubscribe para evitar erro de WebSocket
      setTimeout(() => {
        realtimeService.unsubscribe('all_messages');
      }, 50);
    };
  }, [updateNotifications, handleNewMessage]);

  // Função para decrementar contador quando mensagens são marcadas como lidas
  const decrementClientUnreadCount = useCallback((clientId: string, count: number = 1) => {
    setNotifications(prev => {
      const currentClientCount = prev.clientUnreadCounts[clientId] || 0;
      const newClientCount = Math.max(0, currentClientCount - count);
      const decrementAmount = currentClientCount - newClientCount;
      
      return {
        ...prev,
        unreadMessages: Math.max(0, (prev.unreadMessages || 0) - decrementAmount),
        clientUnreadCounts: {
          ...prev.clientUnreadCounts,
          [clientId]: newClientCount
        }
      };
    });
  }, []);

  return {
    notifications,
    updateNotifications,
    decrementClientUnreadCount,
    forceUpdate: updateNotifications, // Alias para forçar atualização
  };
} 