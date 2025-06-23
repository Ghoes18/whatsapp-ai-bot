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
  markClientMessagesAsRead
} from './src/services/dashboardService';
import { chatWithAdminAI } from './src/services/openaiService';

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
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    const response = await chatWithAdminAI(message);
    res.json({ message: response });
  } catch (error) {
    console.error('Erro no chat com IA admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 