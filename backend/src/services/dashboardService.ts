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
  plan_content: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
}

export interface Plan {
  id: string;
  client_id: string;
  type: string;
  pdf_url: string;
  created_at: string;
  expires_at?: string;
  status: "active" | "expired" | "completed";
  content?: string;
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

// Helper function to update plan status in database
async function updatePlanStatusInDB(planId: string, status: string, editedContent?: string): Promise<void> {
  const updateData: any = { status };

  if (status === "approved" && editedContent) {
    updateData.plan_content = editedContent;
    console.log(`📝 DEBUG: Conteúdo editado fornecido: ${editedContent.substring(0, 100)}...`);
  }

  console.log(`📋 DEBUG: Dados de atualização:`, updateData);

  const { error } = await supabase
    .from("pending_plans")
    .update(updateData)
    .eq("id", planId);

  if (error) {
    console.error("❌ Erro ao atualizar status do plano:", error);
    throw error;
  }

  console.log(`✅ Status do plano atualizado com sucesso para: ${status}`);
}

// Helper function to fetch plan data
async function fetchPlanData(planId: string, includeContent: boolean = false): Promise<any> {
  const selectFields = includeContent 
    ? `client_id, plan_content, client:clients(phone, name)`
    : `client_id, client:clients(phone, name)`;

  const { data: plan, error: planError } = await supabase
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
async function processApprovedPlan(plan: any): Promise<void> {
  console.log(`📋 DEBUG: Dados do plano encontrados:`, {
    client_id: plan.client_id,
    plan_content_length: plan.plan_content?.length ?? 0,
    client_phone: plan.client?.phone,
    client_name: plan.client?.name
  });

  // Salvar plano na tabela plans
  console.log('💾 Salvando plano na tabela plans...');
  const savedPlanId = await saveApprovedPlan(plan.client_id, plan.plan_content);
  console.log(`✅ Plano salvo na tabela plans com ID: ${savedPlanId}`);
  
  // Enviar mensagem para o cliente
  const message = `✅ Seu plano foi aprovado e está pronto!\n\n${plan.plan_content}`;
  console.log(`📱 Enviando mensagem para: ${plan.client.phone}`);
  await sendWhatsappMessage(plan.client.phone, message);
  
  console.log(`✅ Plano enviado com sucesso para ${plan.client.phone}`);
}

// Helper function to notify rejected plan
async function notifyRejectedPlan(plan: any): Promise<void> {
  const clientPhone = plan.client?.phone;
  const clientName = plan.client?.name;
  
  console.log(`📋 DEBUG: Notificando cliente: ${clientPhone} (${clientName})`);
  
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

  console.log(`✅ Cliente ${plan.client_id} notificado sobre revisão do plano`);
}

// Aprovar/rejeitar plano
export async function updatePlanStatus(
  planId: string,
  status: "approved" | "rejected",
  editedContent?: string
): Promise<void> {
  console.log(`🔍 DEBUG: Atualizando status do plano ${planId} para ${status}`);
  
  // Update plan status in database
  await updatePlanStatusInDB(planId, status, editedContent);

  // Process based on status
  if (status === "approved") {
    console.log('🔄 Plano aprovado, processando envio para o cliente...');
    const plan = await fetchPlanData(planId, true);
    await processApprovedPlan(plan);
  } else if (status === "rejected") {
    console.log('🔄 Plano rejeitado, notificando cliente...');
    const plan = await fetchPlanData(planId, false);
    await notifyRejectedPlan(plan);
  }
}

// Salvar plano aprovado na tabela plans
export async function saveApprovedPlan(clientId: string, planContent: string): Promise<string> {
  try {
    console.log(`🔍 DEBUG: Salvando plano aprovado para cliente: ${clientId}`);
    console.log(`📋 DEBUG: Conteúdo do plano: ${planContent.substring(0, 100)}...`);
    
    // Determinar o tipo do plano baseado no conteúdo
    let planType = "Geral";
    if (planContent.toLowerCase().includes("treino") || planContent.toLowerCase().includes("exercício")) {
      planType = "Treino";
    } else if (planContent.toLowerCase().includes("nutricional") || planContent.toLowerCase().includes("alimentação")) {
      planType = "Nutrição";
    }

    console.log(`📊 DEBUG: Tipo do plano determinado: ${planType}`);

    // Calcular data de expiração (30 dias a partir de agora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    console.log(`📅 DEBUG: Data de expiração: ${expiresAt.toISOString()}`);

    // Primeiro, inserir o plano com URL temporária
    const tempPdfUrl = `temp-plan-${Date.now()}.pdf`;

    const { data, error } = await supabase
      .from("plans")
      .insert({
        client_id: clientId,
        type: planType,
        pdf_url: tempPdfUrl, // URL temporária para satisfazer a constraint NOT NULL
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("❌ Erro ao salvar plano aprovado:", error);
      throw error;
    }

    console.log(`✅ Plano salvo com sucesso! ID: ${data.id}`);

    // Agora gerar o PDF e atualizar a URL
    try {
      console.log('📄 Gerando PDF do plano...');
      
      // Buscar dados do cliente para o contexto
      const { data: client } = await supabase
        .from('clients')
        .select('name, age, gender, height, weight, goal')
        .eq('id', clientId)
        .single();

      const clientContext = {
        name: client?.name,
        age: client?.age?.toString(),
        gender: client?.gender,
        height: client?.height?.toString(),
        weight: client?.weight?.toString(),
        goal: client?.goal,
      };

      // Importar e usar o serviço de PDF
      const { generateAndUploadPlanPDF } = await import('./pdfService');
      
      const planData = {
        id: data.id,
        client_id: clientId,
        type: planType,
        content: planContent,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const pdfUrl = await generateAndUploadPlanPDF(planData, clientContext);
      
      // Atualizar o plano com a URL real do PDF
      const { error: updateError } = await supabase
        .from("plans")
        .update({ pdf_url: pdfUrl })
        .eq("id", data.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar URL do PDF:", updateError);
        // Não falhar se não conseguir atualizar a URL
      } else {
        console.log(`✅ URL do PDF atualizada: ${pdfUrl}`);
      }

    } catch (pdfError) {
      console.error("❌ Erro ao gerar PDF:", pdfError);
      // Não falhar se não conseguir gerar o PDF, manter a URL temporária
    }

    console.log(`📋 DEBUG: Dados inseridos:`, {
      client_id: clientId,
      type: planType,
      pdf_url: tempPdfUrl,
      expires_at: expiresAt.toISOString(),
      id: data.id
    });
    
    return data.id;
  } catch (error) {
    console.error("❌ Erro ao salvar plano aprovado:", error);
    throw error;
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

// Obter histórico de planos de um cliente
export async function getClientPlans(clientId: string): Promise<Plan[]> {
  try {
    console.log(`🔍 Buscando planos para cliente: ${clientId}`);
    
    const { data: plans, error } = await supabase
      .from("plans")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    console.log(`📊 Resultado da consulta:`, { plans, error });

    if (error) {
      console.error("❌ Erro ao buscar planos do cliente:", error);
      throw error;
    }

    if (!plans) {
      console.log("📭 Nenhum plano encontrado (plans é null/undefined)");
      return [];
    }

    console.log(`📋 Encontrados ${plans.length} planos para o cliente`);

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

    console.log(`✅ Retornando ${processedPlans.length} planos processados`);
    return processedPlans;
  } catch (error) {
    console.error("❌ Erro ao buscar planos do cliente:", error);
    return [];
  }
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
          content: "Novo plano pendente",
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
export async function getUnreadMessageCounts(): Promise<{ [clientId: string]: number }> {
  try {
    // Buscar mensagens não lidas (onde read é false ou null)
    const { data: unreadMessages, error } = await supabase
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

// Função de debug para listar todos os planos
export async function debugListAllPlans(): Promise<any[]> {
  try {
    console.log("🔍 DEBUG: Listando todos os planos na tabela...");
    
    const { data: allPlans, error } = await supabase
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