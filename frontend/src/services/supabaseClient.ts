import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

// No Vite, variáveis de ambiente do frontend DEVEM ter prefixo VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias para o Realtime funcionar')
}

// Validar se a URL é válida
try {
  new URL(supabaseUrl)
} catch {
  throw new Error('VITE_SUPABASE_URL deve ser uma URL válida (ex: https://seu-projeto.supabase.co)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Types para Realtime
export interface RealtimeMessage {
  id: string
  client_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  read?: boolean
}

export interface RealtimeClient {
  id: string
  phone: string
  name?: string
  last_message_at?: string
  [key: string]: unknown
}

// Classe para gerenciar subscriptions de Realtime
export class RealtimeService {
  private static instance: RealtimeService
  private subscriptions: Map<string, RealtimeChannel> = new Map()

  private constructor() {}

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  // Subscrever às mensagens de um cliente específico
  subscribeToClientMessages(
    clientId: string,
    onNewMessage: (message: RealtimeMessage) => void,
    onMessageUpdate: (message: RealtimeMessage) => void
  ): void {
    const subscriptionKey = `messages_${clientId}`
    
    // Remover subscription anterior se existir
    this.unsubscribe(subscriptionKey)

    try {
      const channel = supabase
        .channel(`client-messages-${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `client_id=eq.${clientId}`,
          },
          (payload) => {
            onNewMessage(payload.new as RealtimeMessage)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `client_id=eq.${clientId}`,
          },
          (payload) => {
            onMessageUpdate(payload.new as RealtimeMessage)
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error(`❌ Erro na subscription para cliente ${clientId}:`, err)
          }
          
          if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Erro no canal para cliente ${clientId}`)
          } else if (status === 'TIMED_OUT') {
            console.error(`⏰ Timeout na subscription para cliente ${clientId}`)
          }
        })

      this.subscriptions.set(subscriptionKey, channel)
      
    } catch (error) {
      console.error(`❌ Erro ao criar subscription para cliente ${clientId}:`, error)
    }
  }

  // Subscrever às atualizações de todos os clientes (para lista)
  subscribeToClientsUpdates(
    onClientUpdate: (client: RealtimeClient) => void
  ): void {
    const subscriptionKey = 'clients_updates'
    
    // Remover subscription anterior se existir
    this.unsubscribe(subscriptionKey)

    try {
      const channel = supabase
        .channel('clients-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clients',
          },
          (payload) => {
            onClientUpdate(payload.new as RealtimeClient)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'clients',
          },
          (payload) => {
            onClientUpdate(payload.new as RealtimeClient)
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error(`❌ Erro na subscription de clientes:`, err)
          }
          
          if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Erro no canal de clientes`)
          } else if (status === 'TIMED_OUT') {
            console.error(`⏰ Timeout na subscription de clientes`)
          }
        })

      this.subscriptions.set(subscriptionKey, channel)
      
    } catch (error) {
      console.error(`❌ Erro ao criar subscription de clientes:`, error)
    }
  }

  // Subscrever às mudanças gerais de mensagens (para notificações)
  subscribeToAllMessages(
    onNewMessage: (message: RealtimeMessage) => void
  ): void {
    const subscriptionKey = 'all_messages'
    
    // Remover subscription anterior se existir
    this.unsubscribe(subscriptionKey)

    try {
      const channel = supabase
        .channel('all-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            onNewMessage(payload.new as RealtimeMessage)
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error(`❌ Erro na subscription de notificações:`, err)
          }
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Sistema de notificações conectado via Realtime')
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Erro no canal de notificações`)
          } else if (status === 'TIMED_OUT') {
            console.error(`⏰ Timeout na subscription de notificações`)
          } else if (status === 'CLOSED') {
            console.log('🔌 Canal de notificações fechado')
          }
        })

      this.subscriptions.set(subscriptionKey, channel)
      
    } catch (error) {
      console.error(`❌ Erro ao criar subscription de notificações:`, error)
    }
  }

  // Remover uma subscription específica
  unsubscribe(subscriptionKey: string): void {
    const channel = this.subscriptions.get(subscriptionKey)
    if (channel) {
      try {
        // Verificar se o canal ainda está ativo antes de tentar remover
        if (channel.state !== 'closed') {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao remover canal ${subscriptionKey}:`, error)
      } finally {
        this.subscriptions.delete(subscriptionKey)
      }
    }
  }

  // Remover todas as subscriptions
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, key) => {
      try {
        if (channel.state !== 'closed') {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao remover canal ${key}:`, error)
      }
    })
    this.subscriptions.clear()
  }

  // Verificar status da conexão
  getConnectionStatus(): string {
    return supabase.realtime.isConnected() ? 'connected' : 'disconnected'
  }
}

export const realtimeService = RealtimeService.getInstance() 