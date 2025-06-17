import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import { realtimeService, type RealtimeMessage } from '../services/supabaseClient';

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

  const isInitializedRef = useRef(false);

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

  // Handler para novas mensagens em tempo real
  const handleNewMessage = useCallback((message: RealtimeMessage) => {
    // Só contar se a mensagem for do usuário (não do assistente) e não estiver lida
    if (message.role === 'user' && !message.read) {
      console.log('📬 Nova mensagem não lida detectada via Realtime:', message);
      
      setNotifications(prev => ({
        ...prev,
        unreadMessages: prev.unreadMessages + 1,
        clientUnreadCounts: {
          ...prev.clientUnreadCounts,
          [message.client_id]: (prev.clientUnreadCounts[message.client_id] || 0) + 1
        }
      }));
    }
  }, []);

  // Handler para atualizações de mensagens (ex: marcadas como lidas)
  const handleMessageUpdate = useCallback((message: RealtimeMessage) => {
    // Se a mensagem foi marcada como lida, atualizar contadores
    if (message.read && message.role === 'user') {
      console.log('✅ Mensagem marcada como lida via Realtime:', message);
      
      setNotifications(prev => {
        const newClientCount = Math.max(0, (prev.clientUnreadCounts[message.client_id] || 0) - 1);
        const newTotalCount = Math.max(0, prev.unreadMessages - 1);
        
        return {
          ...prev,
          unreadMessages: newTotalCount,
          clientUnreadCounts: {
            ...prev.clientUnreadCounts,
            [message.client_id]: newClientCount
          }
        };
      });
    }
  }, []);

  // Inicializar notificações e Realtime
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    console.log('🔔 Inicializando sistema de notificações com Realtime');
    
    // Carregar estado inicial
    updateNotifications();
    
    // Configurar Realtime para todas as mensagens (notificações)
    realtimeService.subscribeToAllMessages(handleNewMessage);
    
    // Backup: polling a cada 30 segundos para garantir sincronização
    const interval = setInterval(updateNotifications, 30000);
    
    isInitializedRef.current = true;
    
    return () => {
      console.log('🔕 Limpando sistema de notificações');
      clearInterval(interval);
      realtimeService.unsubscribe('all_messages');
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
        unreadMessages: Math.max(0, prev.unreadMessages - decrementAmount),
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