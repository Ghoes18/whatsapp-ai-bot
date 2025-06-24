import { supabase } from './supabaseService';
import { generateConversationTitleWithAI } from './openaiService';

type AdminMessage = { role: "user" | "assistant"; content: string };

export interface AdminConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_interaction: string;
}

const DAYS_TO_KEEP_HISTORY = 10;

// Gerar título automático baseado na primeira mensagem
function generateConversationTitle(firstMessage: string): string {
  const words = firstMessage.trim().split(' ').slice(0, 6);
  let title = words.join(' ');
  if (firstMessage.length > title.length) {
    title += '...';
  }
  return title || 'Nova Conversa';
}

// Criar nova conversa
export async function createAdminConversation(firstMessage?: string): Promise<string> {
  const title = firstMessage ? generateConversationTitle(firstMessage) : 'Nova Conversa';
  
  const { data, error } = await supabase
    .from('admin_conversations')
    .insert([{ 
      title,
      last_interaction: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar conversa do admin:', error);
    throw error;
  }

  return data.id;
}

// Listar todas as conversas do admin (ordenadas por última interação)
export async function getAdminConversations(): Promise<AdminConversation[]> {
  // Primeiro, limpar conversas antigas
  await cleanOldAdminConversations();
  
  const { data, error } = await supabase
    .from('admin_conversations')
    .select('*')
    .order('last_interaction', { ascending: false });

  if (error) {
    console.error('Erro ao buscar conversas do admin:', error);
    return [];
  }
  
  return data || [];
}

// Buscar histórico de mensagens de uma conversa específica
export async function getAdminChatHistory(conversationId: string): Promise<AdminMessage[]> {
  const { data, error } = await supabase
    .from('admin_chat_messages')
    .select('role, content')
    .eq('session_id', conversationId) // session_id funciona como conversation_id
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar histórico do admin:', error);
    return [];
  }
  
  return (data as AdminMessage[]) || [];
}

// Salvar mensagem no histórico de uma conversa específica
export async function saveAdminChatMessage(conversationId: string, message: AdminMessage): Promise<void> {
  const { error } = await supabase
    .from('admin_chat_messages')
    .insert([{ 
      session_id: conversationId, // session_id funciona como conversation_id
      role: message.role, 
      content: message.content,
      last_interaction: new Date().toISOString()
    }]);

  if (error) {
    console.error('Erro ao salvar mensagem do admin:', error);
    throw error;
  }

  // Atualizar última interação da conversa
  await updateConversationActivity(conversationId);
  
  // Se é a primeira mensagem do assistente, gerar título com IA
  if (message.role === 'assistant') {
    // Verificar se é a primeira resposta do assistente (após a primeira do usuário)
    const history = await getAdminChatHistory(conversationId);
    const assistantMessages = history.filter(msg => msg.role === 'assistant');
    
    // Só gerar título se é a primeira resposta do assistente
    if (assistantMessages.length === 1) {
      // Pequeno delay para garantir que a mensagem foi salva
      setTimeout(async () => {
        await updateConversationTitleWithAI(conversationId);
      }, 1000);
    }
  }
}

// Atualizar atividade da conversa
async function updateConversationActivity(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  
  // Atualizar tabela de conversas
  const { error: convError } = await supabase
    .from('admin_conversations')
    .update({ 
      last_interaction: now,
      updated_at: now 
    })
    .eq('id', conversationId);

  if (convError) {
    console.error('Erro ao atualizar atividade da conversa:', convError);
  }

  // Atualizar todas as mensagens da conversa
  const { error: msgError } = await supabase
    .from('admin_chat_messages')
    .update({ last_interaction: now })
    .eq('session_id', conversationId);

  if (msgError) {
    console.error('Erro ao atualizar atividade das mensagens:', msgError);
  }
}

// Apagar uma conversa específica
export async function deleteAdminConversation(conversationId: string): Promise<void> {
  // Apagar mensagens da conversa
  const { error: messagesError } = await supabase
    .from('admin_chat_messages')
    .delete()
    .eq('session_id', conversationId);

  if (messagesError) {
    console.error('Erro ao apagar mensagens da conversa:', messagesError);
  }

  // Apagar metadados da conversa
  const { error: conversationError } = await supabase
    .from('admin_conversations')
    .delete()
    .eq('id', conversationId);

  if (conversationError) {
    console.error('Erro ao apagar conversa:', conversationError);
    throw conversationError;
  }
}

// Limpar conversas antigas (mais de 10 dias sem atividade)
export async function cleanOldAdminConversations(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_HISTORY);

  // Buscar conversas antigas
  const { data: oldConversations, error: selectError } = await supabase
    .from('admin_conversations')
    .select('id')
    .lt('last_interaction', cutoffDate.toISOString());

  if (selectError) {
    console.error('Erro ao buscar conversas antigas:', selectError);
    return;
  }

  if (!oldConversations || oldConversations.length === 0) {
    return; // Nenhuma conversa antiga para limpar
  }

  const oldConversationIds = oldConversations.map((conv: { id: string }) => conv.id);

  // Apagar mensagens das conversas antigas
  const { error: messagesError } = await supabase
    .from('admin_chat_messages')
    .delete()
    .in('session_id', oldConversationIds);

  if (messagesError) {
    console.error('Erro ao limpar mensagens antigas:', messagesError);
  }

  // Apagar conversas antigas
  const { error: conversationsError } = await supabase
    .from('admin_conversations')
    .delete()
    .in('id', oldConversationIds);

  if (conversationsError) {
    console.error('Erro ao limpar conversas antigas:', conversationsError);
  } else {
    console.log(`🧹 Limpeza automática: ${oldConversationIds.length} conversas antigas removidas`);
  }
}

// Atualizar título da conversa
export async function updateConversationTitle(conversationId: string, newTitle: string): Promise<void> {
  const { error } = await supabase
    .from('admin_conversations')
    .update({ 
      title: newTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  if (error) {
    console.error('Erro ao atualizar título da conversa:', error);
    throw error;
  }
}

// Buscar conversa por ID (para verificar se existe)
export async function getAdminConversation(conversationId: string): Promise<AdminConversation | null> {
  const { data, error } = await supabase
    .from('admin_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Erro ao buscar conversa:', error);
    return null;
  }

  return data;
}

// Apagar todas as conversas do admin
export async function deleteAllAdminConversations(): Promise<{ deletedConversations: number; deletedMessages: number }> {
  // Primeiro, buscar todas as conversas para contar
  const { data: conversations, error: selectError } = await supabase
    .from('admin_conversations')
    .select('id');

  if (selectError) {
    console.error('Erro ao buscar conversas para apagar:', selectError);
    throw selectError;
  }

  const conversationIds = conversations?.map((conv: { id: string }) => conv.id) || [];
  const conversationCount = conversationIds.length;

  if (conversationCount === 0) {
    return { deletedConversations: 0, deletedMessages: 0 };
  }

  // Apagar todas as mensagens
  const { error: messagesError } = await supabase
    .from('admin_chat_messages')
    .delete()
    .in('session_id', conversationIds);

  if (messagesError) {
    console.error('Erro ao apagar mensagens:', messagesError);
    throw messagesError;
  }

  // Apagar todas as conversas
  const { error: conversationsError } = await supabase
    .from('admin_conversations')
    .delete()
    .in('id', conversationIds);

  if (conversationsError) {
    console.error('Erro ao apagar conversas:', conversationsError);
    throw conversationsError;
  }

  console.log(`🗑️ Apagadas ${conversationCount} conversas e suas mensagens`);
  return { deletedConversations: conversationCount, deletedMessages: conversationCount }; // Simplificado, mas poderia contar mensagens se necessário
}

// Atualizar título da conversa com IA
export async function updateConversationTitleWithAI(conversationId: string): Promise<void> {
  try {
    // Buscar histórico da conversa
    const history = await getAdminChatHistory(conversationId);
    
    // Só gerar título se há pelo menos 2 mensagens (usuário + assistente)
    if (history.length >= 2) {
      const aiTitle = await generateConversationTitleWithAI(history);
      
      // Atualizar o título na base de dados
      const { error } = await supabase
        .from('admin_conversations')
        .update({ 
          title: aiTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Erro ao atualizar título da conversa com IA:', error);
      } else {
        console.log(`🤖 Título gerado com IA: "${aiTitle}" para conversa ${conversationId}`);
      }
    }
  } catch (error) {
    console.error('Erro ao gerar título com IA:', error);
    // Não falhar se a geração de título falhar
  }
} 