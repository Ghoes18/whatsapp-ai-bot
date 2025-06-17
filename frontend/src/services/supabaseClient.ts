import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

// No Vite, variáveis de ambiente do frontend DEVEM ter prefixo VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada')
  console.error('💡 Dica: No Vite, variáveis de ambiente do frontend DEVEM ter prefixo VITE_')
  console.error('💡 Exemplo: SUPABASE_URL → VITE_SUPABASE_URL')
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias para o Realtime funcionar')
}

// Validar se a URL é válida
try {
  new URL(supabaseUrl)
} catch {
  console.error('❌ URL do Supabase inválida:', supabaseUrl)
  throw new Error('VITE_SUPABASE_URL deve ser uma URL válida (ex: https://seu-projeto.supabase.co)')
}

console.log('✅ Supabase configurado com sucesso:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
})

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

    console.log(`🔔 Subscrevendo mensagens do cliente: ${clientId}`)

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
          console.log('📨 Nova mensagem recebida via Realtime:', payload.new)
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
          console.log('📝 Mensagem atualizada via Realtime:', payload.new)
          onMessageUpdate(payload.new as RealtimeMessage)
        }
      )
      .subscribe((status) => {
        console.log(`📡 Status da subscription para cliente ${clientId}:`, status)
      })

    this.subscriptions.set(subscriptionKey, channel)
  }

  // Subscrever às atualizações de todos os clientes (para lista)
  subscribeToClientsUpdates(
    onClientUpdate: (client: RealtimeClient) => void
  ): void {
    const subscriptionKey = 'clients_updates'
    
    // Remover subscription anterior se existir
    this.unsubscribe(subscriptionKey)

    console.log('🔔 Subscrevendo atualizações de clientes')

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
          console.log('👤 Cliente atualizado via Realtime:', payload.new)
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
          console.log('👤 Novo cliente via Realtime:', payload.new)
          onClientUpdate(payload.new as RealtimeClient)
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription de clientes:', status)
      })

    this.subscriptions.set(subscriptionKey, channel)
  }

  // Subscrever às mudanças gerais de mensagens (para notificações)
  subscribeToAllMessages(
    onNewMessage: (message: RealtimeMessage) => void
  ): void {
    const subscriptionKey = 'all_messages'
    
    // Remover subscription anterior se existir
    this.unsubscribe(subscriptionKey)

    console.log('🔔 Subscrevendo todas as mensagens')

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
          console.log('📨 Nova mensagem geral via Realtime:', payload.new)
          onNewMessage(payload.new as RealtimeMessage)
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription de todas as mensagens:', status)
      })

    this.subscriptions.set(subscriptionKey, channel)
  }

  // Remover uma subscription específica
  unsubscribe(subscriptionKey: string): void {
    const channel = this.subscriptions.get(subscriptionKey)
    if (channel) {
      console.log(`🔕 Removendo subscription: ${subscriptionKey}`)
      supabase.removeChannel(channel)
      this.subscriptions.delete(subscriptionKey)
    }
  }

  // Remover todas as subscriptions
  unsubscribeAll(): void {
    console.log('🔕 Removendo todas as subscriptions')
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.subscriptions.clear()
  }

  // Verificar status da conexão
  getConnectionStatus(): string {
    return supabase.realtime.isConnected() ? 'connected' : 'disconnected'
  }
}

export const realtimeService = RealtimeService.getInstance() 