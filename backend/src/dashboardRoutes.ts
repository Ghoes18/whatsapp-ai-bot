import express from 'express';
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
    
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
    }

    await sendMessageToClient(clientId, content);
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

export default router; 