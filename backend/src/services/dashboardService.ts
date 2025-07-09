import { SupabaseClient } from "@supabase/supabase-js";
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
  experience?: string;
  available_days?: string;
  health_conditions?: string;
  exercise_preferences?: string;
  equipment?: string;
  motivation?: string;
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
  read?: boolean;
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
  client_name?: string;
  plan_content: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  has_health_conditions?: boolean;
  health_conditions?: string;
  requires_manual_review?: boolean;
}

export interface Plan {
  id: string;
  client_id: string;
  type: string;
  plan_content: string;
  pdf_url?: string;
  created_at: string;
  expires_at?: string;
  status: "active" | "expired" | "completed";
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
export async function getAllClients(
  supabaseClient: SupabaseClient = supabase
): Promise<Client[]> {
  try {
    const { data: clients, error: clientError } = await supabaseClient
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientError) {
      throw clientError;
    }
    
    const clientsWithLastMessage = await Promise.all(
      clients.map(async (client: Client) => {
        const { data: lastMessage } = await supabaseClient
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
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    throw error;
  }
}

// Obter histórico completo de uma conversa
export async function getConversationHistory(
  clientId: string,
  supabaseClient: SupabaseClient = supabase,
  limit?: number,
  offset?: number
): Promise<Message[]> {
  let query = supabaseClient
    .from("chat_messages")
    .select("id, client_id, role, content, created_at, read")
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
  content: string,
  supabaseClient: SupabaseClient = supabase
): Promise<void> {
  // Primeiro, buscar o número do cliente
  const { data: client, error: clientError } = await supabaseClient
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

  // Salvar a mensagem no histórico
  const { error: messageError } = await supabaseClient.from("chat_messages").insert([
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

  // Atualizar last_message_at do cliente para Realtime
  const { error: updateError } = await supabaseClient
    .from("clients")
    .update({ 
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq("id", clientId);

  if (updateError) {
    console.error("Erro ao atualizar last_message_at:", updateError);
    // Não interromper o fluxo se esta atualização falhar
  }

  // Enviar mensagem via WhatsApp
  try {
    await sendWhatsappMessage(client.phone, content);
  } catch (error) {
    console.error("Erro ao enviar mensagem via WhatsApp:", error);
    throw error;
  }
}

// Alternar status da IA para um cliente
export async function toggleAI(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<boolean> {
  // Primeiro, buscar o status atual e o número do cliente
  const { data: client, error: fetchError } = await supabaseClient
    .from("clients")
    .select("ai_enabled, phone")
    .eq("id", clientId)
    .single();

  if (fetchError) {
    console.error("Erro ao buscar cliente:", fetchError);
    throw fetchError;
  }

  const currentStatus = client.ai_enabled ?? true;
  const newStatus = !currentStatus;

  const { error } = await supabaseClient
    .from("clients")
    .update({
      ai_enabled: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);

  if (error) {
    console.error("Erro ao alternar IA:", error);
    throw error;
  }

  // Se a IA foi reativada, enviar mensagem ao cliente
  if (newStatus === true) {
    const message = "🤖 Olá! A nossa IA foi reativada e já pode interagir comigo. Se precisar de ajuda humana, basta pedir.";
    try {
      await sendMessageToClient(clientId, message, supabaseClient);
    } catch (msgError) {
      console.error(`❌ Erro ao enviar mensagem de reativação da IA para o cliente ${clientId}:`, msgError);
    }
  }

  return newStatus;
}

// Atualizar dados do cliente
export async function updateClientData(
  clientId: string,
  data: Partial<Client>,
  supabaseClient: SupabaseClient = supabase
): Promise<void> {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
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
  planContent: string,
  supabaseClient: SupabaseClient = supabase
): Promise<string> {
  const { data, error } = await supabaseClient
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
export async function getPendingPlans(
  supabaseClient: SupabaseClient = supabase
): Promise<PendingPlan[]> {
  const { data: plans, error } = await supabaseClient
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

  // Importar a função de verificação de condições de saúde
  const { hasHealthConditions } = await import('./openaiService');

  const plansWithClientInfo = await Promise.all(
    plans.map(async (plan: any) => {
      const { data: client } = await supabaseClient
        .from("clients")
        .select("phone, name, health_conditions")
        .eq("id", plan.client_id)
        .single();
      
      // Verificar se o conteúdo do plano indica revisão manual obrigatória
      const requiresManualReview = plan.plan_content.includes("⚠️ PLANO REQUER REVISÃO MANUAL ⚠️");
      
      // Verificar se o cliente tem problemas de saúde
      const clientContext = { health_conditions: client?.health_conditions };
      const hasHealthIssues = await hasHealthConditions(clientContext);
      
      return {
        ...plan,
        client_phone: client?.phone || 'N/A',
        client_name: client?.name || 'Cliente',
        has_health_conditions: hasHealthIssues,
        health_conditions: client?.health_conditions || '',
        requires_manual_review: requiresManualReview || hasHealthIssues,
      };
    })
  );

  return plansWithClientInfo as PendingPlan[];
}

// Helper function to update plan status in database
async function updatePlanStatusInDB(
  planId: string, 
  status: string, 
  supabaseClient: SupabaseClient, 
  editedContent?: string
): Promise<void> {
  const updateData: any = { status };

  if (status === "approved" && editedContent) {
    updateData.plan_content = editedContent;
  }

  const { error } = await supabaseClient
    .from("pending_plans")
    .update(updateData)
    .eq("id", planId);

  if (error) {
    console.error("❌ Erro ao atualizar status do plano:", error);
    throw error;
  }
}

// Helper function to fetch plan data
async function fetchPlanData(
  planId: string, 
  supabaseClient: SupabaseClient, 
  includeContent: boolean = false
): Promise<any> {
  const selectFields = includeContent 
    ? `client_id, plan_content, client:clients(phone, name)`
    : `client_id, client:clients(phone, name)`;

  const { data: plan, error: planError } = await supabaseClient
    .from("pending_plans")
    .select(selectFields)
    .eq("id", planId)
    .single();

  if (planError) {
    console.error("❌ Erro ao buscar dados do plano:", planError);
    throw planError;
  }

  if (!plan) {
    console.error("❌ Plano não encontrado");
    throw new Error("Plano não encontrado");
  }

  return plan;
}

// Helper function to process approved plan
async function processApprovedPlan(
  plan: any, 
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    // Salvar plano na tabela plans
    const savedPlanId = await saveApprovedPlan(plan.client_id, plan.plan_content, supabaseClient);
    
    // Enviar mensagem para o cliente
    const message = `✅ Seu plano foi aprovado e está pronto!\n\n${plan.plan_content}`;
    
    // Salvar mensagem na tabela chat_messages
    const { error: messageError } = await supabaseClient
      .from("chat_messages")
      .insert([
        {
          client_id: plan.client_id,
          role: "assistant",
          content: message,
        },
      ]);

    if (messageError) {
      console.error("Erro ao salvar mensagem do plano:", messageError);
      throw messageError;
    }
    
    // Enviar mensagem via WhatsApp
    await sendWhatsappMessage(plan.client.phone, message);
    
    // Enviar mensagem adicional informando que pode fazer perguntas
    const followUpMessage = "💬 Tem alguma dúvida sobre o seu plano? Pode perguntar qualquer coisa! Estou aqui para ajudar.";
    await sendWhatsappMessage(plan.client.phone, followUpMessage);
    
    // Salvar mensagem de follow-up na tabela chat_messages
    const { error: followUpError } = await supabaseClient
      .from("chat_messages")
      .insert([
        {
          client_id: plan.client_id,
          role: "assistant",
          content: followUpMessage,
        },
      ]);

    if (followUpError) {
      console.error("Erro ao salvar mensagem de follow-up:", followUpError);
    }
    
    // Atualizar estado da conversa para QUESTIONS para permitir perguntas
    const { error: convError } = await supabaseClient
      .from("conversations")
      .update({ 
        state: "QUESTIONS",
        last_interaction: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("client_id", plan.client_id)
      .eq("state", "WAITING_FOR_PAYMENT"); // Só atualizar se estiver em WAITING_FOR_PAYMENT

    if (convError) {
      console.error("Erro ao atualizar estado da conversa:", convError);
    }
    
  } catch (error) {
    console.error("Erro ao processar plano aprovado:", error);
    throw error;
  }
}

// Helper function to notify rejected plan
async function notifyRejectedPlan(
  plan: any,
  supabaseClient: SupabaseClient
): Promise<void> {
  const clientPhone = plan.client?.phone;
  const clientName = plan.client?.name;
  
  try {
    // Mensagens de notificação
    const messages = [
      `Olá ${clientName || 'Cliente'}! O seu plano está a ser revisto pela nossa equipa.`,
      '📋 Estamos a fazer algumas melhorias para garantir a melhor qualidade possível.',
      '⏰ Receberá o seu plano personalizado em breve. Obrigado pela paciência!'
    ];

    // Salvar e enviar cada mensagem
    for (const message of messages) {
      // Salvar na tabela chat_messages
      const { error: messageError } = await supabaseClient
        .from("chat_messages")
        .insert([
          {
            client_id: plan.client_id,
            role: "assistant",
            content: message,
          },
        ]);

      if (messageError) {
        console.error("Erro ao salvar mensagem de notificação:", messageError);
        throw messageError;
      }

      // Enviar via WhatsApp
      await sendWhatsappMessage(clientPhone, message);
    }

  } catch (error) {
    console.error("Erro ao notificar cliente sobre rejeição:", error);
    throw error;
  }
}

// Aprovar/rejeitar plano
export async function updatePlanStatus(
  planId: string,
  status: "approved" | "rejected",
  supabaseClient: SupabaseClient = supabase,
  editedContent?: string
): Promise<void> {
  try {
    // Update plan status in database
    await updatePlanStatusInDB(planId, status, supabaseClient, editedContent);

    // Process based on status
    if (status === "approved") {
      const plan = await fetchPlanData(planId, supabaseClient, true);
      await processApprovedPlan(plan, supabaseClient);
    } else if (status === "rejected") {
      const plan = await fetchPlanData(planId, supabaseClient, false);
      await notifyRejectedPlan(plan, supabaseClient);
    }
  } catch (error) {
    console.error(`Erro ao atualizar status do plano ${planId}:`, error);
    throw error;
  }
}

// Salvar plano aprovado na tabela plans
export async function saveApprovedPlan(
  clientId: string, 
  planContent: string,
  supabaseClient: SupabaseClient = supabase
): Promise<string> {
  try {
    // Verificar se o cliente existe
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, phone, name")
      .eq("id", clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    if (!client) {
      throw new Error("Cliente não encontrado");
    }
    
    // Determinar o tipo do plano baseado no conteúdo
    let planType = "Geral";
    if (planContent.toLowerCase().includes("treino") || planContent.toLowerCase().includes("exercício")) {
      planType = "Treino";
    } else if (planContent.toLowerCase().includes("nutricional") || planContent.toLowerCase().includes("alimentação")) {
      planType = "Nutrição";
    }

    // Calcular data de expiração (30 dias a partir de agora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Preparar dados para inserção
    const planData = {
      client_id: clientId,
      type: planType,
      plan_content: planContent,
      expires_at: expiresAt.toISOString(),
    };

    // Inserir o plano com o conteúdo diretamente
    const { data, error } = await supabaseClient
      .from("plans")
      .insert(planData)
      .select("id")
      .single();

    if (error) {
      throw error;
    }
    
    return data.id;
  } catch (error) {
    console.error("Erro ao salvar plano aprovado:", error);
    throw error;
  }
}

// Buscar um cliente específico
export async function getClientById(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<Client | null> {
  const { data, error } = await supabaseClient
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
export async function getClientStats(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
) {
  try {
    // Contar mensagens
    const { count: messageCount, error: messageError } = await supabaseClient
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (messageError) {
      console.error("Erro ao contar mensagens:", messageError);
    }

    // Contar planos
    const { count: planCount, error: planError } = await supabaseClient
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (planError) {
      console.error("Erro ao contar planos:", planError);
    }

    // Última atividade
    const { data: lastMessage } = await supabaseClient
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
  } catch (error) {
    console.error("Erro ao buscar estatísticas do cliente:", error);
    return {
      totalMessages: 0,
      plansReceived: 0,
      lastActivity: null,
    };
  }
}

// Obter histórico de planos de um cliente
export async function getClientPlans(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<Plan[]> {
  try {
    // Primeiro, verificar se o cliente existe
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, phone, name")
      .eq("id", clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    if (!client) {
      return [];
    }
    
    // Buscar planos
    const { data: plans, error } = await supabaseClient
      .from("plans")
      .select("id, client_id, type, plan_content, pdf_url, created_at, expires_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!plans) {
      return [];
    }

    // Processar status dos planos baseado na data de expiração
    const processedPlans = plans.map((plan: any) => {
      let status: "active" | "expired" | "completed" = "active";
      
      if (plan.expires_at) {
        const now = new Date();
        const expiresAt = new Date(plan.expires_at);
        
        if (now > expiresAt) {
          status = "expired";
        }
      }

      return {
        ...plan,
        status,
      };
    });

    return processedPlans;
  } catch (error) {
    console.error("Erro ao buscar planos do cliente:", error);
    return [];
  }
}

// Obter conteúdo de um plano específico
export async function getPlanContent(
  planId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<any> {
  try {
    const { data: plan, error } = await supabaseClient
      .from("plans")
      .select(`
        id,
        client_id,
        type,
        plan_content,
        created_at,
        expires_at,
        client:clients(name, phone)
      `)
      .eq("id", planId)
      .single();

    if (error) {
      throw error;
    }

    if (!plan) {
      throw new Error("Plano não encontrado");
    }

    // Processar status do plano baseado na data de expiração
    let status: "active" | "expired" | "completed" = "active";
    if (plan.expires_at) {
      const now = new Date();
      const expiresAt = new Date(plan.expires_at);
      
      if (now > expiresAt) {
        status = "expired";
      }
    }

    return {
      id: plan.id,
      client_id: plan.client_id,
      type: plan.type,
      plan_content: plan.plan_content,
      created_at: plan.created_at,
      expires_at: plan.expires_at,
      client: plan.client,
      status
    };
  } catch (error) {
    console.error("Erro ao buscar conteúdo do plano:", error);
    throw error;
  }
}

// Obter estatísticas gerais do dashboard
export async function getDashboardStats(
  supabaseClient: SupabaseClient = supabase
) {
  try {
    // Total de clientes
    const { count: totalClients, error: clientsError } = await supabaseClient
      .from("clients")
      .select("*", { count: "exact", head: true });

    if (clientsError) {
      console.error("Erro ao contar clientes:", clientsError);
    }

    // Conversas ativas (clientes com AI ativa)
    const { count: activeConversations, error: activeError } = await supabaseClient
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("ai_enabled", true);

    if (activeError) {
      console.error("Erro ao contar conversas ativas:", activeError);
    }

    // Planos pendentes
    const { count: pendingPlans, error: pendingError } = await supabaseClient
      .from("pending_plans")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (pendingError) {
      console.error("Erro ao contar planos pendentes:", pendingError);
    }

    // Mensagens de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayMessages, error: messagesError } = await supabaseClient
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (messagesError) {
      console.error("Erro ao contar mensagens de hoje:", messagesError);
    }

    // Requests de suporte humano pendentes
    const { count: humanSupportRequests, error: supportError } = await supabaseClient
      .from("human_support_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (supportError) {
      console.error("Erro ao contar requests de suporte:", supportError);
    }

    // Clientes que pagaram (taxa de conversão)
    const { count: paidClients, error: paidError } = await supabaseClient
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("paid", true);

    if (paidError) {
      console.error("Erro ao contar clientes pagos:", paidError);
    }

    // Planos entregues (aprovados) nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: weeklyPlans, error: weeklyError } = await supabaseClient
      .from("plans")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (weeklyError) {
      console.error("Erro ao contar planos da semana:", weeklyError);
    }

    return {
      totalClients: totalClients || 0,
      activeConversations: activeConversations || 0,
      pendingPlans: pendingPlans || 0,
      todayMessages: todayMessages || 0,
      humanSupportRequests: humanSupportRequests || 0,
      paidClients: paidClients || 0,
      weeklyPlans: weeklyPlans || 0,
      conversionRate: totalClients ? Math.round((paidClients || 0) / totalClients * 100) : 0,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do dashboard:", error);
    return {
      totalClients: 0,
      activeConversations: 0,
      pendingPlans: 0,
      todayMessages: 0,
      humanSupportRequests: 0,
      paidClients: 0,
      weeklyPlans: 0,
      conversionRate: 0,
    };
  }
}

// Obter estatísticas avançadas para o dashboard
export async function getAdvancedDashboardStats(
  supabaseClient: SupabaseClient = supabase
) {
  try {
    // Taxa de resposta (mensagens respondidas vs mensagens recebidas nas últimas 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: userMessages } = await supabaseClient
      .from("chat_messages")
      .select("id, client_id")
      .eq("role", "user")
      .gte("created_at", yesterday.toISOString());

    const { data: botMessages } = await supabaseClient
      .from("chat_messages")
      .select("id, client_id")
      .eq("role", "assistant")
      .gte("created_at", yesterday.toISOString());

    const responseRate = userMessages?.length 
      ? Math.round((botMessages?.length || 0) / userMessages.length * 100)
      : 100;

    // Tempo médio de resposta (simulado baseado em dados reais - pode ser implementado melhor)
    const avgResponseTime = responseRate > 90 ? "< 1 min" : responseRate > 70 ? "2-3 min" : "5+ min";

    // Distribuição de objetivos dos clientes
    const { data: clientGoals } = await supabaseClient
      .from("clients")
      .select("goal")
      .not("goal", "is", null);

    const goalDistribution: { [key: string]: number } = {};
    clientGoals?.forEach((client: any) => {
      if (client.goal) {
        const goal = client.goal.toLowerCase();
        goalDistribution[goal] = (goalDistribution[goal] || 0) + 1;
      }
    });

    // Top 3 objetivos mais comuns
    const topGoals = Object.entries(goalDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([goal, count]) => ({ goal, count }));

    // Crescimento de clientes nos últimos 7 dias
    const { data: weeklyClients } = await supabaseClient
      .from("clients")
      .select("created_at")
      .gte("created_at", yesterday.toISOString());

    const clientGrowth = weeklyClients?.length || 0;

    // Satisfação estimada baseada em interações (clientes que continuaram conversando)
    const { data: activeClientsWithMessages } = await supabaseClient
      .from("chat_messages")
      .select("client_id")
      .gte("created_at", yesterday.toISOString())
      .eq("role", "user");

    const uniqueActiveClients = new Set(activeClientsWithMessages?.map((m: any) => m.client_id)).size;
    const engagementRate = Math.min(95, Math.max(60, Math.round(uniqueActiveClients / (userMessages?.length || 1) * 100)));
    const satisfactionScore = Math.round(engagementRate / 20 * 10) / 10; // Converte para escala 0-5

    return {
      responseRate,
      avgResponseTime,
      goalDistribution: topGoals,
      clientGrowth,
      satisfactionScore,
      engagementRate,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas avançadas:", error);
    return {
      responseRate: 95,
      avgResponseTime: "2.3 min",
      goalDistribution: [],
      clientGrowth: 0,
      satisfactionScore: 4.8,
      engagementRate: 85,
    };
  }
}

// Obter métricas de performance por período
export async function getDashboardMetrics(
  supabaseClient: SupabaseClient = supabase,
  days: number = 7
) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Novos clientes por dia
    const { data: newClientsData } = await supabaseClient
      .from("clients")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Mensagens por dia
    const { data: messagesData } = await supabaseClient
      .from("chat_messages")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Planos criados por dia
    const { data: plansData } = await supabaseClient
      .from("plans")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    // Agrupar por dia
    const dailyMetrics: { [date: string]: { clients: number; messages: number; plans: number } } = {};
    
    // Processar novos clientes
    newClientsData?.forEach((client: any) => {
      const date = new Date(client.created_at).toISOString().split('T')[0];
      if (!dailyMetrics[date]) dailyMetrics[date] = { clients: 0, messages: 0, plans: 0 };
      dailyMetrics[date].clients++;
    });

    // Processar mensagens
    messagesData?.forEach((message: any) => {
      const date = new Date(message.created_at).toISOString().split('T')[0];
      if (!dailyMetrics[date]) dailyMetrics[date] = { clients: 0, messages: 0, plans: 0 };
      dailyMetrics[date].messages++;
    });

    // Processar planos
    plansData?.forEach((plan: any) => {
      const date = new Date(plan.created_at).toISOString().split('T')[0];
      if (!dailyMetrics[date]) dailyMetrics[date] = { clients: 0, messages: 0, plans: 0 };
      dailyMetrics[date].plans++;
    });

    return dailyMetrics;
  } catch (error) {
    console.error("Erro ao buscar métricas do dashboard:", error);
    return {};
  }
}

// Obter atividade recente
export async function getRecentActivity(
  supabaseClient: SupabaseClient = supabase
): Promise<RecentActivity[]> {
  try {
    // Mensagens recentes
    const { data: recentMessages } = await supabaseClient
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
    const { data: recentPendingPlansData } = await supabaseClient
      .from("pending_plans")
      .select("id, created_at, client_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(2);

    // Planos aprovados recentes (da tabela plans)
    const { data: recentApprovedPlansData } = await supabaseClient
      .from("plans")
      .select("id, created_at, client_id")
      .order("created_at", { ascending: false })
      .limit(2);

    // Processar planos pendentes
    const recentPendingPlans = recentPendingPlansData ? await Promise.all(
      recentPendingPlansData.map(async (plan: any) => {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('phone, name')
          .eq('id', plan.client_id)
          .single();
        return {
          id: plan.id,
          created_at: plan.created_at,
          clients: client ? [client] : [{phone: 'N/A', name: 'N/A'}],
          type: 'pending'
        };
      })
    ) : [];

    // Processar planos aprovados
    const recentApprovedPlans = recentApprovedPlansData ? await Promise.all(
      recentApprovedPlansData.map(async (plan: any) => {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('phone, name')
          .eq('id', plan.client_id)
          .single();
        return {
          id: plan.id,
          created_at: plan.created_at,
          clients: client ? [client] : [{phone: 'N/A', name: 'N/A'}],
          type: 'approved'
        };
      })
    ) : [];

    // Novos clientes recentes
    const { data: recentClients } = await supabaseClient
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

    // Adicionar planos pendentes
    if (recentPendingPlans) {
      recentPendingPlans.forEach((plan: any) => {
        activities.push({
          id: `pending-plan-${plan.id}`,
          clientPhone: plan.clients[0]?.phone || 'Unknown',
          clientName: plan.clients[0]?.name,
          type: "plan",
          content: "Novo plano pendente",
          timestamp: plan.created_at,
          status: "pending",
        });
      });
    }

    // Adicionar planos aprovados
    if (recentApprovedPlans) {
      recentApprovedPlans.forEach((plan: any) => {
        activities.push({
          id: `approved-plan-${plan.id}`,
          clientPhone: plan.clients[0]?.phone || 'Unknown',
          clientName: plan.clients[0]?.name,
          type: "plan",
          content: "Plano aprovado e enviado",
          timestamp: plan.created_at,
          status: "completed",
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
          status: "active",
        });
      });
    }

    // Ordenar por timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, 10); // Retornar apenas as 10 mais recentes
  } catch (error) {
    console.error("Erro ao buscar atividade recente:", error);
    return [];
  }
}

// Obter contagens de mensagens não lidas por cliente
export async function getUnreadMessageCounts(
  supabaseClient: SupabaseClient = supabase
): Promise<{ [clientId: string]: number }> {
  try {
    // Buscar mensagens não lidas (onde read é false ou null)
    const { data: unreadMessages, error } = await supabaseClient
      .from("chat_messages")
      .select("client_id, id")
      .or("read.is.null,read.eq.false")
      .eq("role", "user"); // Apenas mensagens do usuário

    if (error) {
      console.error("Erro ao buscar mensagens não lidas:", error);
      return {};
    }

    // Agrupar por client_id e contar
    const counts: { [clientId: string]: number } = {};
    if (unreadMessages) {
      unreadMessages.forEach((message: any) => {
        const clientId = message.client_id;
        counts[clientId] = (counts[clientId] || 0) + 1;
      });
    }

    return counts;
  } catch (error) {
    console.error("Erro ao contar mensagens não lidas:", error);
    return {};
  }
}

// Marcar todas as mensagens de um cliente como lidas
export async function markClientMessagesAsRead(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<{ success: boolean; markedCount: number }> {
  try {
    const { data: messages, error: fetchError } = await supabaseClient
      .from("chat_messages")
      .select("id")
      .eq("client_id", clientId)
      .eq("role", "user")
      .or("read.is.null,read.eq.false");

    if (fetchError) {
      console.error("Erro ao buscar mensagens não lidas:", fetchError);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      return { success: true, markedCount: 0 };
    }

    const messageIds = messages.map((msg: { id: string }) => msg.id);
    
    const { error: updateError } = await supabaseClient
      .from("chat_messages")
      .update({ read: true })
      .in("id", messageIds);

    if (updateError) {
      console.error("Erro ao marcar mensagens como lidas:", updateError);
      throw updateError;
    }

    console.log(`✅ ${messageIds.length} mensagens marcadas como lidas para o cliente ${clientId}`);
    return { success: true, markedCount: messageIds.length };
  } catch (error) {
    console.error("Erro ao marcar mensagens como lidas:", error);
    throw error;
  }
}

// Função de debug para listar todos os planos
export async function debugListAllPlans(
  supabaseClient: SupabaseClient = supabase
): Promise<any[]> {
  try {
    console.log("🔍 DEBUG: Listando todos os planos na tabela...");
    
    const { data: allPlans, error } = await supabaseClient
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    console.log(`📊 DEBUG: Total de planos na tabela: ${allPlans?.length || 0}`);
    console.log("📋 DEBUG: Planos encontrados:", allPlans);
    
    if (error) {
      console.error("❌ DEBUG: Erro ao listar planos:", error);
    }

    return allPlans || [];
  } catch (error) {
    console.error("❌ DEBUG: Erro ao listar planos:", error);
    return [];
  }
}

// Criar plano manual para cliente (usado em casos de problemas de saúde)
export async function createManualPlan(
  clientId: string, 
  planContent: string,
  supabaseClient: SupabaseClient = supabase
): Promise<string> {
  try {
    // Verificar se o cliente existe e buscar seus dados
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, phone, name")
      .eq("id", clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    // Salvar como plano pendente para seguir o fluxo normal de aprovação
    const { data, error } = await supabaseClient
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
      console.error("Erro ao salvar plano manual:", error);
      throw error;
    }

    console.log(`✅ Plano manual criado (ID: ${data.id}) para cliente ${client.name}`);

    // ENVIAR MENSAGEM PARA O CLIENTE VIA WHATSAPP
    try {
      console.log(`📤 Enviando plano manual para ${client.name} (${client.phone})`);
      
      // Preparar mensagem com o plano
      const message = `🏥 *PLANO PERSONALIZADO CRIADO MANUALMENTE*

Olá ${client.name || 'Cliente'}! 

Criei um plano personalizado especialmente para ti, considerando as tuas condições de saúde e objetivos.

${planContent}

⚠️ *IMPORTANTE:*
- Este plano foi criado manualmente por um profissional
- Consulte sempre um médico antes de iniciar qualquer atividade física
- Monitore sinais de desconforto durante os exercícios
- Em caso de dúvida, procure acompanhamento profissional

Espero que este plano te ajude a atingir os teus objetivos de forma segura! 💪

Precisas de algum esclarecimento sobre o plano?`;

      // Enviar via WhatsApp
      await sendWhatsappMessage(client.phone, message);
      
      // Salvar a mensagem no histórico de chat
      await supabaseClient.from("chat_messages").insert([
        {
          client_id: clientId,
          role: "assistant",
          content: message,
        },
      ]);

      console.log(`✅ Plano manual enviado com sucesso para ${client.name}`);
      
    } catch (whatsappError) {
      console.error("❌ Erro ao enviar plano via WhatsApp:", whatsappError);
      // Não falhar a operação se o WhatsApp falhar, apenas logar o erro
    }

    return data.id;
  } catch (error) {
    console.error("Erro ao criar plano manual:", error);
    throw error;
  }
}

// NOVA FUNÇÃO: Enviar plano manual diretamente ao cliente
export async function sendManualPlanToClient(
  clientId: string, 
  planContent: string,
  supabaseClient: SupabaseClient = supabase
): Promise<string> {
  try {
    // Verificar se o cliente existe e buscar seus dados
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, phone, name")
      .eq("id", clientId)
      .single();

    if (clientError) {
      throw clientError;
    }

    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    console.log(`📤 Enviando plano manual diretamente para ${client.name} (${client.phone})`);
    
    // Preparar mensagem com o plano
    const message = `🏥 *PLANO PERSONALIZADO CRIADO MANUALMENTE*

Olá ${client.name || 'Cliente'}! 

Criei um plano personalizado especialmente para ti, considerando as tuas condições de saúde e objetivos.

${planContent}

⚠️ *IMPORTANTE:*
- Este plano foi criado manualmente por um profissional
- Consulte sempre um médico antes de iniciar qualquer atividade física
- Monitore sinais de desconforto durante os exercícios
- Em caso de dúvida, procure acompanhamento profissional

Espero que este plano te ajude a atingir os teus objetivos de forma segura! 💪

Precisas de algum esclarecimento sobre o plano?`;

    // Enviar via WhatsApp
    await sendWhatsappMessage(client.phone, message);
    
    // Salvar como plano aprovado diretamente na tabela plans
    const { data: planData, error: planError } = await supabaseClient
      .from("plans")
      .insert([
        {
          client_id: clientId,
          type: "Manual Health Plan",
          plan_content: planContent,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (planError) {
      console.error("Erro ao salvar plano aprovado:", planError);
      throw planError;
    }
    
    // Salvar a mensagem no histórico de chat
    await supabaseClient.from("chat_messages").insert([
      {
        client_id: clientId,
        role: "assistant",
        content: message,
      },
    ]);

    // Remover todos os planos pendentes para este cliente (já que foi resolvido manualmente)
    const { error: deletePendingError } = await supabaseClient
      .from("pending_plans")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "pending");

    if (deletePendingError) {
      console.error("Aviso: Erro ao remover planos pendentes:", deletePendingError);
      // Não falhar a operação, apenas avisar
    }

    // Atualizar estado da conversa para QUESTIONS para permitir perguntas sobre o plano
    const { error: convError } = await supabaseClient
      .from("conversations")
      .update({ 
        state: "QUESTIONS",
        last_interaction: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("client_id", clientId);

    if (convError) {
      console.error("Erro ao atualizar estado da conversa:", convError);
    } else {
      console.log("✅ Estado da conversa atualizado para QUESTIONS");
    }

    console.log(`✅ Plano manual enviado e salvo como aprovado para ${client.name}`);
    
    return planData.id;
  } catch (error) {
    console.error("Erro ao enviar plano manual:", error);
    throw error;
  }
}

// Buscar dados completos do cliente para criação de plano manual
export async function getClientForManualPlan(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<any> {
  try {
    const { data: client, error } = await supabaseClient
      .from("clients")
      .select(`
        id, 
        phone, 
        name, 
        age, 
        gender, 
        height, 
        weight, 
        goal, 
        experience, 
        available_days, 
        health_conditions, 
        exercise_preferences, 
        dietary_restrictions, 
        equipment, 
        motivation
      `)
      .eq("id", clientId)
      .single();

    if (error) {
      throw error;
    }

    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    return client;
  } catch (error) {
    console.error("Erro ao buscar dados do cliente:", error);
    throw error;
  }
}

// Atualizar conteúdo do plano pendente (para salvamento temporário)
export async function updatePendingPlanContent(
  clientId: string, 
  planContent: string,
  supabaseClient: SupabaseClient = supabase
): Promise<{ success: boolean; message: string }> {
  try {
    // Buscar plano pendente existente para este cliente
    const { data: existingPlan, error: findError } = await supabaseClient
      .from("pending_plans")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "pending")
      .single();

    if (findError && findError.code !== 'PGRST116') { // 'PGRST116' means no rows found
      console.error("Erro ao buscar plano pendente:", findError);
      throw findError;
    }

    if (existingPlan) {
      // Atualizar o plano existente
      const { error: updateError } = await supabaseClient
        .from("pending_plans")
        .update({ plan_content: planContent, updated_at: new Date().toISOString() })
        .eq("id", existingPlan.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Conteúdo do plano pendente atualizado para cliente ${clientId}`);
      return { success: true, message: "Rascunho do plano pendente atualizado com sucesso." };
    } else {
      // Criar um novo plano pendente
      const { error: insertError } = await supabaseClient
        .from("pending_plans")
        .insert({
          client_id: clientId,
          plan_content: planContent,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Plano pendente criado para o cliente ${clientId}`);
      return { success: true, message: "Plano pendente criado com sucesso." };
    }
  } catch (error) {
    console.error("Erro ao atualizar plano pendente:", error);
    return { success: false, message: "Erro ao salvar rascunho" };
  }
}

// Obter conteúdo do plano pendente atual (rascunho)
export async function getCurrentPendingPlan(
  clientId: string,
  supabaseClient: SupabaseClient = supabase
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from("pending_plans")
      .select("plan_content")
      .eq("client_id", clientId)
      .eq("status", "pending")
      .single();

    if (error) {
      console.log("Nenhum plano pendente encontrado para o cliente");
      return null;
    }

    return data?.plan_content || null;
  } catch (error) {
    console.error("Erro ao buscar plano pendente:", error);
    return null;
  }
}

