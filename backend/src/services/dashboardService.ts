import { supabase } from "./supabaseService";
import { sendWhatsappMessage } from "./zapi";

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
  role: "user" | "assistant" | "system";
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
  status: "pending" | "approved" | "rejected";
}

export interface RecentActivity {
  id: string;
  clientPhone: string;
  clientName?: string;
  type: "message" | "plan" | "client";
  content: string;
  timestamp: string;
  status: "active" | "pending" | "completed";
}

// Listar todos os clientes com última mensagem
export async function getAllClients(): Promise<Client[]> {
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (clientError) {
    console.error("Erro ao buscar clientes:", clientError);
    throw clientError;
  }
  
  const clientsWithLastMessage = await Promise.all(
    clients.map(async (client: Client) => {
      const { data: lastMessage } = await supabase
        .from("chat_messages")
        .select("created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...client,
        last_message_at: lastMessage?.created_at || client.created_at,
      };
    })
  );

  // Ordenar por data da última mensagem
  clientsWithLastMessage.sort((a, b) => {
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return clientsWithLastMessage;
}

// Obter histórico completo de uma conversa
export async function getConversationHistory(
  clientId: string,
  limit?: number,
  offset?: number
): Promise<Message[]> {
  let query = supabase
    .from("chat_messages")
    .select("id, client_id, role, content, created_at") // Selecionar apenas campos necessários
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  // Adicionar paginação se especificado
  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.range(offset, offset + (limit || 100) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }

  console.log(
    `Encontradas ${data?.length || 0} mensagens para cliente ${clientId}`
  );
  return data || [];
}

// Enviar mensagem diretamente para o cliente
export async function sendMessageToClient(
  clientId: string,
  content: string
): Promise<void> {
  console.log('=== sendMessageToClient ===');
  console.log('clientId:', clientId);
  console.log('content:', content);
  
  // Primeiro, buscar o número do cliente
  console.log('Buscando dados do cliente...');
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("phone")
    .eq("id", clientId)
    .single();

  if (clientError) {
    console.error("Erro ao buscar cliente:", clientError);
    throw clientError;
  }

  if (!client?.phone) {
    console.error("Número do cliente não encontrado, client data:", client);
    throw new Error("Número do cliente não encontrado");
  }
  
  console.log('Cliente encontrado:', client);

  // Salvar a mensagem no histórico
  console.log('Salvando mensagem no histórico...');
  const { error: messageError } = await supabase.from("chat_messages").insert([
    {
      client_id: clientId,
      role: "assistant",
      content: content,
    },
  ]);

  if (messageError) {
    console.error("Erro ao salvar mensagem:", messageError);
    throw messageError;
  }
  
  console.log('Mensagem salva no histórico com sucesso');

  // Enviar mensagem via WhatsApp
  try {
    console.log('Enviando mensagem via WhatsApp para:', client.phone);
    await sendWhatsappMessage(client.phone, content);
    console.log('Mensagem enviada via WhatsApp com sucesso');
  } catch (error) {
    console.error("Erro ao enviar mensagem via WhatsApp:", error);
    throw error;
  }
}

// Alternar status da IA para um cliente
export async function toggleAI(clientId: string): Promise<boolean> {
  // Primeiro, buscar o status atual
  const { data: client, error: fetchError } = await supabase
    .from("clients")
    .select("ai_enabled")
    .eq("id", clientId)
    .single();

  if (fetchError) {
    console.error("Erro ao buscar cliente:", fetchError);
    throw fetchError;
  }

  const currentStatus = client.ai_enabled ?? true; // Default to true if not set
  const newStatus = !currentStatus;

  const { error } = await supabase
    .from("clients")
    .update({
      ai_enabled: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    console.error("Erro ao atualizar status da IA:", error);
    throw error;
  }

  return newStatus;
}

// Atualizar dados do cliente
export async function updateClientData(
  clientId: string,
  data: Partial<Client>
): Promise<void> {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", clientId);

  if (error) {
    console.error("Erro ao atualizar cliente:", error);
    throw error;
  }
}

// Salvar plano pendente de revisão
export async function savePendingPlan(
  clientId: string,
  planContent: string
): Promise<string> {
  const { data, error } = await supabase
    .from("pending_plans")
    .insert([
      {
        client_id: clientId,
        plan_content: planContent,
        status: "pending",
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao salvar plano pendente:", error);
    throw error;
  }

  return data.id;
}

// Obter planos pendentes de revisão
export async function getPendingPlans(): Promise<PendingPlan[]> {
  const { data: plans, error } = await supabase
    .from("pending_plans")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Erro ao buscar planos pendentes:", error);
    throw error;
  }
  
  if (!plans) {
    return [];
  }

  const plansWithClientPhone = await Promise.all(
    plans.map(async (plan: any) => {
      const { data: client } = await supabase
        .from("clients")
        .select("phone")
        .eq("id", plan.client_id)
        .single();
      
      return {
        ...plan,
        client_phone: client?.phone || 'N/A',
      };
    })
  );

  return plansWithClientPhone as PendingPlan[];
}

// Aprovar/rejeitar plano
export async function updatePlanStatus(
  planId: string,
  status: "approved" | "rejected",
  editedContent?: string
): Promise<void> {
  const updateData: any = { status };

  if (status === "approved" && editedContent) {
    updateData.plan_content = editedContent;
  }

  const { error } = await supabase
    .from("pending_plans")
    .update(updateData)
    .eq("id", planId);

  if (error) {
    console.error("Erro ao atualizar status do plano:", error);
    throw error;
  }

  // Se aprovado, processar e enviar o plano para o cliente
  if (status === "approved") {
    console.log('Plano aprovado, processando envio para o cliente...');
    
    const { data: plan } = await supabase
      .from("pending_plans")
      .select(`
        client_id,
        plan_content,
        client:clients(phone, name)
      `)
      .eq("id", planId)
      .single();

    if (plan) {
      const planContent = editedContent || plan.plan_content;
      const clientPhone = plan.client?.phone;
      const clientName = plan.client?.name;
      
      try {
        // Salvar o plano aprovado na tabela de clientes
        await supabase
          .from("clients")
          .update({
            plan_text: planContent,
            paid: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.client_id);

        // Atualizar conversa para estado de perguntas
        await supabase
          .from('conversations')
          .update({ state: 'QUESTIONS' })
          .eq('client_id', plan.client_id);

        // Enviar notificação via WhatsApp
        await sendWhatsappMessage(
          clientPhone,
          `🎉 Olá ${clientName || 'Cliente'}! O seu plano personalizado foi aprovado e está pronto!`
        );
        
        // Enviar o plano
        await sendWhatsappMessage(clientPhone, planContent);
        
        await sendWhatsappMessage(
          clientPhone,
          '✅ Plano enviado! Agora pode fazer perguntas sobre o seu treino e nutrição. Como posso ajudar?'
        );

        console.log(`Plano aprovado e enviado com sucesso para cliente ${plan.client_id}`);
        
      } catch (error) {
        console.error('Erro ao enviar plano aprovado:', error);
        throw new Error('Plano aprovado mas falhou o envio ao cliente');
      }
    }
  } else if (status === "rejected") {
    console.log('Plano rejeitado, notificando cliente...');
    
    // Buscar dados do plano rejeitado
    const { data: plan } = await supabase
      .from("pending_plans")
      .select(`
        client_id,
        client:clients(phone, name)
      `)
      .eq("id", planId)
      .single();

    if (plan) {
      const clientPhone = plan.client?.phone;
      const clientName = plan.client?.name;
      
      try {
        // Notificar cliente sobre rejeição
        await sendWhatsappMessage(
          clientPhone,
          `Olá ${clientName || 'Cliente'}! O seu plano está a ser revisto pela nossa equipa.`
        );
        
        await sendWhatsappMessage(
          clientPhone,
          '📋 Estamos a fazer algumas melhorias para garantir a melhor qualidade possível.'
        );
        
        await sendWhatsappMessage(
          clientPhone,
          '⏰ Receberá o seu plano personalizado em breve. Obrigado pela paciência!'
        );

        console.log(`Cliente ${plan.client_id} notificado sobre revisão do plano`);
        
      } catch (error) {
        console.error('Erro ao notificar cliente sobre plano rejeitado:', error);
      }
    }
  }
}

// Buscar um cliente específico
export async function getClientById(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) {
    console.error("Erro ao buscar cliente:", error);
    return null;
  }

  return {
    ...data,
    ai_enabled: data.ai_enabled ?? true, // Default to true if not set
  };
}

// Obter estatísticas do cliente
export async function getClientStats(clientId: string) {
  // Contar mensagens
  const { count: messageCount } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);

  // Contar planos
  const { count: planCount } = await supabase
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);

  // Última atividade
  const { data: lastMessage } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    totalMessages: messageCount || 0,
    plansReceived: planCount || 0,
    lastActivity: lastMessage?.created_at || null,
  };
}

// Obter estatísticas gerais do dashboard
export async function getDashboardStats() {
  try {
    // Total de clientes
    const { count: totalClients } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    // Conversas ativas (clientes com AI ativa)
    const { count: activeConversations } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("ai_enabled", true);

    // Planos pendentes
    const { count: pendingPlans } = await supabase
      .from("pending_plans")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Mensagens de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayMessages } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    return {
      totalClients: totalClients || 0,
      activeConversations: activeConversations || 0,
      pendingPlans: pendingPlans || 0,
      todayMessages: todayMessages || 0,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    return {
      totalClients: 0,
      activeConversations: 0,
      pendingPlans: 0,
      todayMessages: 0,
    };
  }
}

// Obter atividade recente
export async function getRecentActivity(): Promise<RecentActivity[]> {
  try {
    // Mensagens recentes
    const { data: recentMessages } = await supabase
      .from("chat_messages")
      .select(
        `
        id,
        content,
        created_at,
        role,
        clients!inner(phone, name)
      `
      )
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(3);

    // Planos pendentes recentes
    const { data: recentPlansData } = await supabase
      .from("pending_plans")
      .select("id, created_at, client_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(2);

    const recentPlans = recentPlansData ? await Promise.all(
      recentPlansData.map(async (plan: any) => {
        const { data: client } = await supabase
          .from('clients')
          .select('phone, name')
          .eq('id', plan.client_id)
          .single();
        return {
          id: plan.id,
          created_at: plan.created_at,
          clients: client ? [client] : [{phone: 'N/A', name: 'N/A'}],
        };
      })
    ) : [];

    // Novos clientes recentes
    const { data: recentClients } = await supabase
      .from("clients")
      .select("id, phone, name, created_at")
      .order("created_at", { ascending: false })
      .limit(2);

    const activities: RecentActivity[] = [];

    // Adicionar mensagens
    if (recentMessages) {
      recentMessages.forEach((msg: any) => {
        activities.push({
          id: `msg-${msg.id}`,
          clientPhone: msg.clients[0]?.phone || 'Unknown',
          clientName: msg.clients[0]?.name,
          type: "message",
          content: "Nova mensagem recebida",
          timestamp: msg.created_at,
          status: "active",
        });
      });
    }

    // Adicionar planos
    if (recentPlans) {
      recentPlans.forEach((plan: any) => {
        activities.push({
          id: `plan-${plan.id}`,
          clientPhone: plan.clients[0]?.phone || 'Unknown',
          clientName: plan.clients[0]?.name,
          type: "plan",
          content: "Plano aguardando aprovação",
          timestamp: plan.created_at,
          status: "pending",
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
          type: "client",
          content: "Novo cliente cadastrado",
          timestamp: client.created_at,
          status: "completed",
        });
      });
    }

    // Ordenar por timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return activities.slice(0, 5); // Limitar a 5 atividades
  } catch (error) {
    console.error("Erro ao buscar atividade recente:", error);
    return [];
  }
}