import express from 'express';
import { supabase } from './src/services/supabaseService';
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
  getRecentActivity,
  getUnreadMessageCounts,
  getClientPlans,
  getPlanContent
} from './src/services/dashboardService';
import { 
  sendWhatsappMessage, 
  sendImage, 
  sendDocument, 
  sendAudio, 
  sendTyping, 
  getMessageStatus,
  markMessageAsRead 
} from './src/services/zapi';
import rateLimit from 'express-rate-limit';

// Cache simples em memória para melhorar performance
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern?: string) {
  if (pattern) {
    for (const [key] of cache) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

const router = express.Router();

// Rate limiting para endpoints de mensagens
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 mensagens por minuto por IP
  message: {
    error: 'Muitas mensagens enviadas. Tente novamente em um minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para endpoints de media
const mediaRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 uploads de media por minuto por IP
  message: {
    error: 'Muitos uploads de media. Tente novamente em um minuto.',
    retryAfter: 60
  },
});

router.use('/clients/:clientId/messages', messageRateLimit);
router.use('/clients/:clientId/image', mediaRateLimit);
router.use('/clients/:clientId/document', mediaRateLimit);
router.use('/clients/:clientId/audio', mediaRateLimit);

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

// Obter contagens de mensagens não lidas por cliente
router.get('/messages/unread-counts', async (req, res) => {
  try {
    const unreadCounts = await getUnreadMessageCounts();
    res.json(unreadCounts);
  } catch (error) {
    console.error('Erro ao buscar contagens de mensagens não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os clientes
router.get('/clients', async (req, res) => {
  try {
    const cacheKey = 'all_clients';
    
    // Verificar cache primeiro
    const cachedClients = getCachedData(cacheKey);
    if (cachedClients) {
      console.log('👥 Retornando clientes do cache');
      return res.json(cachedClients);
    }
    
    console.log('👥 Buscando clientes no banco');
    const clients = await getAllClients();
    
    // Cachear resultado
    setCachedData(cacheKey, clients);
    
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
    const { limit, offset } = req.query;
    const cacheKey = `messages_${clientId}_${limit || 'all'}_${offset || '0'}`;
    
    // Verificar cache primeiro
    const cachedMessages = getCachedData(cacheKey);
    if (cachedMessages) {
      console.log(`📨 Retornando mensagens do cache para cliente: ${clientId}`);
      return res.json(cachedMessages);
    }
    
    console.log(`📨 Buscando mensagens no banco para cliente: ${clientId}`);
    const messages = await getConversationHistory(
      clientId, 
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    
    // Cachear resultado
    setCachedData(cacheKey, messages);
    
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de planos de um cliente
router.get('/clients/:clientId/plans', async (req, res) => {
  try {
    const { clientId } = req.params;
    const cacheKey = `plans_${clientId}`;
    
    // Verificar cache primeiro
    const cachedPlans = getCachedData(cacheKey);
    if (cachedPlans) {
      console.log(`📋 Retornando planos do cache para cliente: ${clientId}`);
      return res.json(cachedPlans);
    }
    
    console.log(`📋 Buscando planos no banco para cliente: ${clientId}`);
    const plans = await getClientPlans(clientId);
    
    // Cachear resultado
    setCachedData(cacheKey, plans);
    
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter conteúdo de um plano específico
router.get('/plans/:planId/content', async (req, res) => {
  try {
    const { planId } = req.params;
    const cacheKey = `plan_content_${planId}`;
    
    // Verificar cache primeiro
    const cachedPlan = getCachedData(cacheKey);
    if (cachedPlan) {
      console.log(`📋 Retornando conteúdo do plano do cache: ${planId}`);
      return res.json({ plan: cachedPlan });
    }
    
    console.log(`📋 Buscando conteúdo do plano no banco: ${planId}`);
    const plan = await getPlanContent(planId);
    
    // Cachear resultado
    setCachedData(cacheKey, plan);
    
    res.json({ plan });
  } catch (error) {
    console.error('Erro ao buscar conteúdo do plano:', error);
    if (error instanceof Error && error.message === 'Plano não encontrado') {
      res.status(404).json({ error: 'Plano não encontrado' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
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
    
    // Invalidar cache de mensagens deste cliente
    invalidateCache(`messages_${clientId}`);
    
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

// Marcar múltiplas mensagens como lidas (NOVO - otimizado com função da DB)
router.post('/clients/:clientId/messages/mark-read', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Tentar usar função RPC primeiro
    try {
      const { data, error } = await supabase.rpc('mark_client_messages_read', {
        p_client_id: clientId
      });
      
      if (!error && data) {
        const result = Array.isArray(data) ? data[0] : data;
        
        // Invalidar cache de mensagens deste cliente
        invalidateCache(`messages_${clientId}`);
        
        console.log(`✅ ${result?.marked_count || 0} mensagens marcadas como lidas para cliente ${clientId}`);
        return res.json({ 
          success: result?.success || true, 
          markedCount: result?.marked_count || 0 
        });
      }
    } catch (rpcError) {
      console.log('Função RPC não disponível, usando abordagem alternativa...');
    }
    
    // Abordagem alternativa: atualizar diretamente na tabela
    const { data: updateResult, error: updateError } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('client_id', clientId)
      .eq('read', false)
      .select('id');
    
    if (updateError) {
      console.error('Erro ao marcar mensagens como lidas:', updateError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    const markedCount = updateResult?.length || 0;
    
    // Invalidar cache de mensagens deste cliente
    invalidateCache(`messages_${clientId}`);
    
    console.log(`✅ ${markedCount} mensagens marcadas como lidas para cliente ${clientId}`);
    res.json({ 
      success: true, 
      markedCount: markedCount 
    });
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
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

// Performance test endpoint
router.get('/performance-test/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const startTime = Date.now();
    
    console.log(`🧪 Iniciando teste de performance para cliente: ${clientId}`);
    
    // Teste 1: Buscar cliente
    const clientStart = Date.now();
    const client = await getClientById(clientId);
    const clientTime = Date.now() - clientStart;
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    // Teste 2: Buscar mensagens
    const messagesStart = Date.now();
    const messages = await getConversationHistory(clientId);
    const messagesTime = Date.now() - messagesStart;
    
    // Teste 3: Marcar como lidas (simulação)
    const markReadStart = Date.now();
    const { data: markResult } = await supabase.rpc('mark_client_messages_read', {
      p_client_id: clientId
    });
    const markReadTime = Date.now() - markReadStart;
    
    const totalTime = Date.now() - startTime;
    
    const results = {
      success: true,
      totalTime: `${totalTime}ms`,
      tests: {
        getClient: {
          time: `${clientTime}ms`,
          success: !!client,
          data: { name: client.name, phone: client.phone }
        },
        getMessages: {
          time: `${messagesTime}ms`,
          success: true,
          count: messages.length
        },
        markAsRead: {
          time: `${markReadTime}ms`,
          success: !!markResult,
          markedCount: markResult?.marked_count || 0
        }
      },
      performance: {
        excellent: totalTime < 100,
        good: totalTime < 300,
        acceptable: totalTime < 500,
        poor: totalTime >= 500
      }
    };
    
    console.log(`🧪 Teste de performance concluído em ${totalTime}ms`);
    res.json(results);
    
  } catch (error) {
    console.error('Erro no teste de performance:', error);
    res.status(500).json({ 
      error: 'Erro no teste de performance',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️  Endpoints de debug habilitados (apenas em desenvolvimento)');
} else {
  // Remover rotas temporárias em produção
  console.log('🔒 Endpoints de debug desabilitados em produção');
  
  // Substituir por handlers que retornam 404
  router.post('/cleanup/messages', (req, res) => {
    res.status(404).json({ error: 'Endpoint não disponível em produção' });
  });
  
  router.post('/debug/webhook', (req, res) => {
    res.status(404).json({ error: 'Endpoint não disponível em produção' });
  });
}

export default router; 