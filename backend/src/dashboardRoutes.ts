import express from 'express';
import { supabase } from './services/supabaseService';
import {
  getAllClients,
  getConversationHistory,
  sendMessageToClient,
  toggleAI,
  updateClientData,
  getPendingPlans,
  updatePlanStatus,
  savePendingPlan,
  getClientById,
  getClientStats,
  getDashboardStats,
  getRecentActivity
} from './services/dashboardService';
import { 
  sendWhatsappMessage, 
  sendImage, 
  sendDocument, 
  sendAudio, 
  sendTyping, 
  getMessageStatus,
  markMessageAsRead 
} from './services/zapi';

const router = express.Router();

// Obter estatísticas gerais do dashboard
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter atividade recente
router.get('/recent-activity', async (req, res) => {
  try {
    const activity = await getRecentActivity();
    res.json(activity);
  } catch (error) {
    console.error('Erro ao buscar atividade recente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os clientes
router.get('/clients', async (req, res) => {
  try {
    const clients = await getAllClients();
    res.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter dados de um cliente específico
router.get('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await getClientById(clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas de um cliente
router.get('/clients/:clientId/stats', async (req, res) => {
  try {
    const { clientId } = req.params;
    const stats = await getClientStats(clientId);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de conversa de um cliente
router.get('/clients/:clientId/messages', async (req, res) => {
  try {
    const { clientId } = req.params;
    const messages = await getConversationHistory(clientId);
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem para cliente
router.post('/clients/:clientId/messages', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { content } = req.body;
    
    console.log('=== DASHBOARD: Enviar mensagem ===');
    console.log('clientId:', clientId);
    console.log('content:', content);
    console.log('req.body:', req.body);
    
    if (!content) {
      console.error('Erro: Conteúdo da mensagem é obrigatório');
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
    }

    console.log('Chamando sendMessageToClient...');
    await sendMessageToClient(clientId, content);
    console.log('Mensagem enviada com sucesso!');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alternar status da IA para um cliente
router.post('/clients/:clientId/toggle-ai', async (req, res) => {
  try {
    const { clientId } = req.params;
    const newStatus = await toggleAI(clientId);
    res.json({ ai_enabled: newStatus });
  } catch (error) {
    console.error('Erro ao alternar IA:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar dados do cliente
router.put('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const updateData = req.body;
    
    await updateClientData(clientId, updateData);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar planos pendentes de revisão
router.get('/pending-plans', async (req, res) => {
  try {
    const plans = await getPendingPlans();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar ou rejeitar plano
router.post('/pending-plans/:planId/review', async (req, res) => {
  try {
    const { planId } = req.params;
    const { status, editedContent } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    await updatePlanStatus(planId, status, editedContent);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao revisar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar plano pendente (para uso da IA)
router.post('/pending-plans', async (req, res) => {
  try {
    const { clientId, planContent } = req.body;
    
    if (!clientId || !planContent) {
      return res.status(400).json({ error: 'clientId e planContent são obrigatórios' });
    }

    const planId = await savePendingPlan(clientId, planContent);
    res.json({ planId });
  } catch (error) {
    console.error('Erro ao criar plano pendente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter status de uma mensagem
router.get('/messages/:messageId/status', async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = await getMessageStatus(messageId);
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status da mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar notificação de digitação
router.post('/clients/:clientId/typing', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { isTyping } = req.body;

    // Buscar número do cliente
    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();

    if (!client?.phone) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await sendTyping(client.phone, isTyping);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar status de digitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar imagem
router.post('/clients/:clientId/image', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { imageUrl, caption } = req.body;

    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();

    if (!client?.phone) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await sendImage(client.phone, imageUrl, caption);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar documento
router.post('/clients/:clientId/document', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { documentUrl, filename } = req.body;

    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();

    if (!client?.phone) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await sendDocument(client.phone, documentUrl, filename);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar áudio
router.post('/clients/:clientId/audio', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { audioUrl } = req.body;

    const { data: client } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();

    if (!client?.phone) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await sendAudio(client.phone, audioUrl);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar áudio:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint para testar conectividade
router.get('/debug', async (req, res) => {
  try {
    console.log('=== DEBUG ENDPOINT ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('ZAPI_URL:', process.env.ZAPI_URL ? 'Configurado' : 'NÃO CONFIGURADO');
    console.log('ZAPI_CLIENT_TOKEN:', process.env.ZAPI_CLIENT_TOKEN ? 'Configurado' : 'NÃO CONFIGURADO');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        zapi_url_configured: !!process.env.ZAPI_URL,
        zapi_token_configured: !!process.env.ZAPI_CLIENT_TOKEN,
        node_env: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Erro no debug endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ENDPOINT TEMPORÁRIO: Limpar mensagens com perfis de clientes misturadas
router.post('/cleanup/messages', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpeza de mensagens com perfis de clientes...');
    
    // Primeiro, buscar mensagens que contêm elementos típicos de planos/perfis
    const { data: problematicMessages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id, content')
      .or('content.ilike.%Cliente:%,content.ilike.%Nome:%,content.ilike.%Idade:%,content.ilike.%Género:%,content.ilike.%Altura:%,content.ilike.%Peso:%,content.ilike.%Objetivo:%,content.ilike.%Plano personalizado do cliente:%,content.ilike.%Plano de Treino%,content.ilike.%Dados do Cliente%');
    
    if (fetchError) {
      console.error('Erro ao buscar mensagens problemáticas:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
    
    console.log(`Encontradas ${problematicMessages?.length || 0} mensagens problemáticas`);
    
    if (problematicMessages && problematicMessages.length > 0) {
      // Mostrar algumas para debug
      console.log('Exemplo de mensagem problemática:', problematicMessages[0]?.content?.substring(0, 200) + '...');
      
      // Deletar as mensagens problemáticas
      const idsToDelete = problematicMessages.map(msg => msg.id);
      
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Erro ao deletar mensagens:', deleteError);
        return res.status(500).json({ error: 'Erro ao deletar mensagens' });
      }
      
      console.log(`✅ ${idsToDelete.length} mensagens problemáticas removidas`);
      res.json({ 
        success: true, 
        message: `${idsToDelete.length} mensagens com perfis/planos removidas`,
        deletedIds: idsToDelete
      });
    } else {
      console.log('✅ Nenhuma mensagem problemática encontrada');
      res.json({ success: true, message: 'Nenhuma mensagem problemática encontrada' });
    }
    
  } catch (error) {
    console.error('Erro ao limpar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ENDPOINT TEMPORÁRIO: Debug webhook - simular mensagem do WhatsApp
router.post('/debug/webhook', async (req, res) => {
  try {
    console.log('🐛 Debug webhook chamado com body:', JSON.stringify(req.body, null, 2));
    
    // Reenviar para o webhook handler real
    const webhookResponse = await fetch('http://localhost:3000/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const result = await webhookResponse.text();
    
    res.json({ 
      success: true, 
      status: webhookResponse.status,
      response: result,
      originalBody: req.body
    });
  } catch (error) {
    console.error('Erro no debug webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 