import { supabase } from './supabaseService'; // já exportado no seu service

type Message = { role: "system" | "user" | "assistant"; content: string };

// Buscar histórico de mensagens do cliente (ordenado por data)
export async function getChatHistory(clientId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
  // Retorna apenas user/assistant (ignora system)
  return (data as Message[]).filter(msg => msg.role === 'user' || msg.role === 'assistant');
}

// Salvar mensagem no histórico
export async function saveChatMessage(clientId: string, message: Message): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert([{ client_id: clientId, role: message.role, content: message.content }]);
  if (error) {
    console.error('Erro ao salvar mensagem:', error);
  }
}
