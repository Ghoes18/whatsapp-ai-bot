import { supabase } from './supabaseService';

export interface Client {
  id: string;
  phone: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
  activity_level?: string;
  dietary_restrictions?: string;
  paid: boolean;
  plan_url?: string;
  plan_text?: string;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_context?: any;
  last_message_at?: string;
}

export interface Message {
  id: string;
  client_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  state: string;
  last_interaction: string;
  context: any;
  created_at: string;
  updated_at: string;
}

export interface PendingPlan {
  id: string;
  client_id: string;
  client_phone: string;
  plan_content: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RecentActivity {
  id: string;
  clientPhone: string;
  clientName?: string;
  type: 'message' | 'plan' | 'client';
  content: string;
  timestamp: string;
  status: 'active' | 'pending' | 'completed';
}

// Listar todos os clientes com última mensagem
export async function getAllClients(): Promise<Client[]> {
  try {
    // Primeiro, buscar todos os clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('Erro ao buscar clientes:', clientsError);
      return [];
    }

    if (!clients || clients.length === 0) {
      return [];
    }

    // Para cada cliente, buscar a última mensagem
    const clientsWithMessages = await Promise.all(
      clients.map(async (client) => {
        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...client,
          last_message_at: lastMessage?.created_at || null,
          ai_enabled: client.ai_enabled ?? true // Default to true if not set
        };
      })
    );

    return clientsWithMessages;
  } catch (error) {
    console.error('Erro ao buscar clientes com mensagens:', error);
    return [];
  }
}

// Obter histórico completo de uma conversa
export async function getConversationHistory(clientId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }

  console.log(`Encontradas ${data?.length || 0} mensagens para cliente ${clientId}`);
  return data || [];
}

// Enviar mensagem diretamente para o cliente
export async function sendMessageToClient(clientId: string, content: string): Promise<void> {
  // Salvar a mensagem no histórico
  const { error } = await supabase
    .from('chat_messages')
    .insert([{
      client_id: clientId,
      role: 'assistant',
      content: content
    }]);

  if (error) {
    console.error('Erro ao salvar mensagem:', error);
    throw error;
  }

  // TODO: Integração com WhatsApp API para enviar a mensagem
  // Aqui você pode chamar o serviço do WhatsApp para enviar a mensagem
}

// Alternar status da IA para um cliente
export async function toggleAI(clientId: string): Promise<boolean> {
  // Primeiro, buscar o status atual
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('ai_enabled')
    .eq('id', clientId)
    .single();

  if (fetchError) {
    console.error('Erro ao buscar cliente:', fetchError);
    throw fetchError;
  }

  const currentStatus = client.ai_enabled ?? true; // Default to true if not set
  const newStatus = !currentStatus;

  const { error } = await supabase
    .from('clients')
    .update({ 
      ai_enabled: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId);

  if (error) {
    console.error('Erro ao atualizar status da IA:', error);
    throw error;
  }

  return newStatus;
}

// Atualizar dados do cliente
export async function updateClientData(clientId: string, data: Partial<Client>): Promise<void> {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', clientId);

  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }
}

// Salvar plano pendente de revisão
export async function savePendingPlan(clientId: string, planContent: string): Promise<string> {
  const { data, error } = await supabase
    .from('pending_plans')
    .insert([{
      client_id: clientId,
      plan_content: planContent,
      status: 'pending'
    }])
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao salvar plano pendente:', error);
    throw error;
  }

  return data.id;
}

// Obter planos pendentes de revisão
export async function getPendingPlans(): Promise<PendingPlan[]> {
  const { data, error } = await supabase
    .from('pending_plans')
    .select(`
      *,
      clients!inner(phone)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar planos pendentes:', error);
    return [];
  }

  return data.map(plan => ({
    ...plan,
    client_phone: plan.clients.phone
  }));
}

// Aprovar/rejeitar plano
export async function updatePlanStatus(planId: string, status: 'approved' | 'rejected', editedContent?: string): Promise<void> {
  const updateData: any = { status };
  
  if (status === 'approved' && editedContent) {
    updateData.plan_content = editedContent;
  }

  const { error } = await supabase
    .from('pending_plans')
    .update(updateData)
    .eq('id', planId);

  if (error) {
    console.error('Erro ao atualizar status do plano:', error);
    throw error;
  }

  // Se aprovado, enviar o plano para o cliente
  if (status === 'approved') {
    const { data: plan } = await supabase
      .from('pending_plans')
      .select('client_id, plan_content')
      .eq('id', planId)
      .single();

    if (plan) {
      await sendMessageToClient(plan.client_id, editedContent || plan.plan_content);
      
      // Salvar o plano aprovado na tabela de clientes
      await supabase
        .from('clients')
        .update({ 
          plan_text: editedContent || plan.plan_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.client_id);
    }
  }
}

// Buscar um cliente específico
export async function getClientById(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  return {
    ...data,
    ai_enabled: data.ai_enabled ?? true // Default to true if not set
  };
}

// Obter estatísticas do cliente
export async function getClientStats(clientId: string) {
  // Contar mensagens
  const { count: messageCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  // Contar planos
  const { count: planCount } = await supabase
    .from('plans')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  // Última atividade
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    totalMessages: messageCount || 0,
    plansReceived: planCount || 0,
    lastActivity: lastMessage?.created_at || null
  };
}

// Obter estatísticas gerais do dashboard
export async function getDashboardStats() {
  try {
    // Total de clientes
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // Conversas ativas (clientes com AI ativa)
    const { count: activeConversations } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('ai_enabled', true);

    // Planos pendentes
    const { count: pendingPlans } = await supabase
      .from('pending_plans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Mensagens de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    return {
      totalClients: totalClients || 0,
      activeConversations: activeConversations || 0,
      pendingPlans: pendingPlans || 0,
      todayMessages: todayMessages || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    return {
      totalClients: 0,
      activeConversations: 0,
      pendingPlans: 0,
      todayMessages: 0
    };
  }
}

// Obter atividade recente
export async function getRecentActivity(): Promise<RecentActivity[]> {
  try {
    // Mensagens recentes
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select(`
        id,
        content,
        created_at,
        role,
        clients!inner(phone, name)
      `)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(3);

    // Planos pendentes recentes
    const { data: recentPlans } = await supabase
      .from('pending_plans')
      .select(`
        id,
        created_at,
        clients!inner(phone, name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(2);

    // Novos clientes recentes
    const { data: recentClients } = await supabase
      .from('clients')
      .select('id, phone, name, created_at')
      .order('created_at', { ascending: false })
      .limit(2);

    const activities: RecentActivity[] = [];

    // Adicionar mensagens
    if (recentMessages) {
      recentMessages.forEach((msg: any) => {
        activities.push({
          id: `msg-${msg.id}`,
          clientPhone: msg.clients.phone,
          clientName: msg.clients.name,
          type: 'message',
          content: 'Nova mensagem recebida',
          timestamp: msg.created_at,
          status: 'active'
        });
      });
    }

    // Adicionar planos
    if (recentPlans) {
      recentPlans.forEach((plan: any) => {
        activities.push({
          id: `plan-${plan.id}`,
          clientPhone: plan.clients.phone,
          clientName: plan.clients.name,
          type: 'plan',
          content: 'Plano aguardando aprovação',
          timestamp: plan.created_at,
          status: 'pending'
        });
      });
    }

    // Adicionar novos clientes
    if (recentClients) {
      recentClients.forEach((client: any) => {
        activities.push({
          id: `client-${client.id}`,
          clientPhone: client.phone,
          clientName: client.name,
          type: 'client',
          content: 'Novo cliente cadastrado',
          timestamp: client.created_at,
          status: 'completed'
        });
      });
    }

    // Ordenar por timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, 5); // Limitar a 5 atividades
  } catch (error) {
    console.error('Erro ao buscar atividade recente:', error);
    return [];
  }
} 