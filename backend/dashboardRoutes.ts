import express from 'express';
import {
  getAllClients,
  getClientById,
  getClientStats,
  getClientPlans,
  updateClientData,
  toggleAI,
  getConversationHistory,
  sendMessageToClient,
  getPendingPlans,
  updatePlanStatus,
  savePendingPlan,
  getDashboardStats,
  getRecentActivity,
  getUnreadMessageCounts,
  getPlanContent,
  saveApprovedPlan,
  debugListAllPlans,
  markClientMessagesAsRead,
  getAdvancedDashboardStats,
  getDashboardMetrics
} from './src/services/dashboardService';
import { getContactProfilePicture } from './src/services/zapi';
import { chatWithAdminAI } from './src/services/openaiService';
import { 
  getAdminChatHistory, 
  getAdminConversations,
  createAdminConversation,
  deleteAdminConversation,
  getAdminConversation,
  updateConversationTitle,
  deleteAllAdminConversations
} from './src/services/adminChatHistoryService';
import { supabase } from './src/services/supabaseService';

const router = express.Router();

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Advanced dashboard stats
router.get('/stats/advanced', async (req, res) => {
  try {
    const advancedStats = await getAdvancedDashboardStats();
    res.json(advancedStats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas avançadas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard metrics with period
router.get('/metrics', async (req, res) => {
  try {
    const { days } = req.query;
    const metrics = await getDashboardMetrics(days ? parseInt(days as string) : 7);
    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const activity = await getRecentActivity();
    res.json(activity);
  } catch (error) {
    console.error('Erro ao buscar atividade recente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Unread message counts
router.get('/messages/unread-counts', async (req, res) => {
  try {
    const counts = await getUnreadMessageCounts();
    res.json(counts);
  } catch (error) {
    console.error('Erro ao buscar contagens de mensagens não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await getAllClients();
    res.json(clients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get specific client
router.get('/clients/:clientId', async (req, res) => {
  try {
    const client = await getClientById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get client stats
router.get('/clients/:clientId/stats', async (req, res) => {
  try {
    const stats = await getClientStats(req.params.clientId);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get client plans
router.get('/clients/:clientId/plans', async (req, res) => {
  try {
    const plans = await getClientPlans(req.params.clientId);
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update client
router.put('/clients/:clientId', async (req, res) => {
  try {
    await updateClientData(req.params.clientId, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Toggle AI for client
router.post('/clients/:clientId/toggle-ai', async (req, res) => {
  try {
    const newStatus = await toggleAI(req.params.clientId);
    res.json({ ai_enabled: newStatus });
  } catch (error) {
    console.error('Erro ao alternar IA:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get client profile picture from WhatsApp
router.get('/clients/:clientId/profile-picture', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Buscar dados do cliente para obter o telefone
    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Verificar se já temos uma imagem de perfil salva recentemente (cache de 1 hora)
    const { data: cachedData, error: cacheError } = await supabase
      .from('clients')
      .select('profile_picture_url, updated_at')
      .eq('id', clientId)
      .single();
    
    if (!cacheError && cachedData?.profile_picture_url) {
      const lastUpdate = new Date(cachedData.updated_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Se a imagem foi atualizada há menos de 1 hora, usar cache
      if (lastUpdate > oneHourAgo) {
        return res.json({ link: cachedData.profile_picture_url });
      }
    }
    
    // Buscar nova imagem de perfil da Z-API
    const profilePictureData = await getContactProfilePicture(client.phone);
    
    if (profilePictureData?.link) {
      // Salvar a nova URL na base de dados
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          profile_picture_url: profilePictureData.link,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
      
      if (updateError) {
        console.error('Erro ao salvar URL da imagem de perfil:', updateError);
      }
      
      res.json({ link: profilePictureData.link });
    } else {
      // Retornar null se não conseguir buscar a imagem
      res.json({ link: null });
    }
  } catch (error) {
    console.error('Erro ao buscar imagem de perfil do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get client messages
router.get('/clients/:clientId/messages', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const messages = await getConversationHistory(
      req.params.clientId,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Send message to client
router.post('/clients/:clientId/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
    }
    
    await sendMessageToClient(req.params.clientId, content);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Mark client messages as read
router.post('/clients/:clientId/messages/mark-read', async (req, res) => {
  try {
    const result = await markClientMessagesAsRead(req.params.clientId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get pending plans
router.get('/pending-plans', async (req, res) => {
  try {
    const plans = await getPendingPlans();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Review pending plan
router.post('/pending-plans/:planId/review', async (req, res) => {
  try {
    const { status, editedContent } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    await updatePlanStatus(req.params.planId, status, editedContent);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao revisar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create pending plan
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

// Get plan content
router.get('/plans/:planId/content', async (req, res) => {
  try {
    const plan = await getPlanContent(req.params.planId);
    res.json({ plan });
  } catch (error) {
    console.error('Erro ao buscar conteúdo do plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Debug endpoint to list all plans
router.get('/debug/plans', async (req, res) => {
  try {
    const plans = await debugListAllPlans();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos (debug):', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Admin AI Chat endpoint
router.post('/admin/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || !conversationId) {
      return res.status(400).json({ error: 'Mensagem e conversationId são obrigatórios' });
    }
    
    const response = await chatWithAdminAI(message, conversationId);
    res.json({ message: response });
  } catch (error) {
    console.error('Erro no chat com IA admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all admin conversations
router.get('/admin/conversations', async (req, res) => {
  try {
    const conversations = await getAdminConversations();
    res.json({ conversations });
  } catch (error) {
    console.error('Erro ao buscar conversas do admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new admin conversation
router.post('/admin/conversations', async (req, res) => {
  try {
    const { firstMessage } = req.body;
    const conversationId = await createAdminConversation(firstMessage);
    res.json({ conversationId });
  } catch (error) {
    console.error('Erro ao criar conversa do admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete all admin conversations (MUST come before parameterized routes)
router.delete('/admin/conversations', async (req, res) => {
  try {
    const result = await deleteAllAdminConversations();
    res.json({ 
      success: true, 
      message: `${result.deletedConversations} conversas removidas com sucesso`,
      deletedConversations: result.deletedConversations,
      deletedMessages: result.deletedMessages
    });
  } catch (error) {
    console.error('Erro ao remover todas as conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get specific conversation details
router.get('/admin/conversations/:conversationId', async (req, res) => {
  try {
    const conversation = await getAdminConversation(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    res.json({ conversation });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get admin chat history for specific conversation
router.get('/admin/conversations/:conversationId/history', async (req, res) => {
  try {
    const history = await getAdminChatHistory(req.params.conversationId);
    res.json({ history });
  } catch (error) {
    console.error('Erro ao buscar histórico da conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update conversation title
router.put('/admin/conversations/:conversationId/title', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    
    await updateConversationTitle(req.params.conversationId, title);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar título da conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete admin conversation
router.delete('/admin/conversations/:conversationId', async (req, res) => {
  try {
    await deleteAdminConversation(req.params.conversationId);
    res.json({ success: true, message: 'Conversa removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Test endpoint to generate conversation title with AI
router.post('/admin/conversations/:conversationId/generate-title', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Verificar se a conversa existe
    const conversation = await getAdminConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }
    
    // Buscar histórico da conversa
    const history = await getAdminChatHistory(conversationId);
    
    // Gerar título com IA
    const { generateConversationTitleWithAI } = await import('./src/services/openaiService');
    const aiTitle = await generateConversationTitleWithAI(history);
    
    // Atualizar o título na base de dados
    await updateConversationTitle(conversationId, aiTitle);
    
    res.json({ 
      success: true, 
      message: 'Título gerado com sucesso',
      oldTitle: conversation.title,
      newTitle: aiTitle
    });
  } catch (error) {
    console.error('Erro ao gerar título da conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Human Support Requests endpoints
router.get('/human-support-requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('human_support_requests')
      .select(`
        *,
        clients (
          id,
          name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar solicitações de suporte:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erro ao buscar solicitações de suporte:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/human-support-requests/count', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('human_support_requests')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao contar solicitações de suporte:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ count: data?.length || 0 });
  } catch (error) {
    console.error('Erro ao contar solicitações de suporte:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/human-support-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, handledBy, notes } = req.body;

    const { error } = await supabase
      .from('human_support_requests')
      .update({
        status,
        handled_by: handledBy,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Erro ao atualizar solicitação de suporte:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar solicitação de suporte:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 