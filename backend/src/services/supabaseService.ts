import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getOrCreateClient(phone: string) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .single();
  if (client) return client;
  if (error && error.code !== 'PGRST116') throw error;
  const { data: newClient, error: newClientError } = await supabase
    .from('clients')
    .insert([{ phone, ai_enabled: true }])
    .select()
    .single();
  if (newClientError) throw newClientError;
  return newClient;
}

export async function getActiveConversation(clientId: string) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return conversation;
}

export async function updateConversationContext(conversationId: string, context: any) {
  if (!conversationId) throw new Error('ID da conversa não fornecido');
  const { error } = await supabase
    .from('conversations')
    .update({ context })
    .eq('id', conversationId);
  if (error) throw error;
}

export async function updateClientAfterPayment(clientId: string, planUrl: string, context: any) {
  // Atualiza o cliente com status de pagamento e link do plano
  const { error } = await supabase
    .from('clients')
    .update({ paid: true, plan_url: planUrl, last_context: context })
    .eq('id', clientId);
  if (error) throw error;
}

export async function savePlanText(clientId: string, planText: string) {
  const { error } = await supabase
    .from('clients')
    .update({ plan_text: planText })
    .eq('id', clientId);
  if (error) throw error;
}

export async function getPlanText(clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('plan_text')
    .eq('id', clientId)
    .single();
  if (error) {
    console.error('Erro ao buscar plano:', error);
    return null;
  }
  return data?.plan_text || null;
} 