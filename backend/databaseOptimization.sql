-- Otimizações de Performance para WhatsApp AI Bot Database
-- Execute estes comandos no Supabase SQL Editor para melhorar significativamente a performance

-- 1. Adicionar coluna 'read' na tabela chat_messages se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chat_messages' AND column_name = 'read') THEN
        ALTER TABLE public.chat_messages ADD COLUMN read boolean DEFAULT false;
    END IF;
END $$;

-- 2. Indexes para melhorar performance das consultas principais

-- Index composto para buscar mensagens por cliente ordenadas por data
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_created 
ON public.chat_messages (client_id, created_at);

-- Index para filtrar mensagens não lidas por cliente e role
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_role_read 
ON public.chat_messages (client_id, role, read) 
WHERE read = false;

-- Index para buscar mensagens por role
CREATE INDEX IF NOT EXISTS idx_chat_messages_role 
ON public.chat_messages (role);

-- Index para clientes com AI ativa
CREATE INDEX IF NOT EXISTS idx_clients_ai_enabled 
ON public.clients (ai_enabled) 
WHERE ai_enabled = true;

-- Index para planos pendentes
CREATE INDEX IF NOT EXISTS idx_pending_plans_status 
ON public.pending_plans (status) 
WHERE status = 'pending';

-- Index composto para pending_plans com join de clientes
CREATE INDEX IF NOT EXISTS idx_pending_plans_status_created 
ON public.pending_plans (status, created_at);

-- Index para conversas por cliente
CREATE INDEX IF NOT EXISTS idx_conversations_client 
ON public.conversations (client_id);

-- Index para buscar última mensagem de cada cliente
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_created_desc 
ON public.chat_messages (client_id, created_at DESC);

-- 3. Função otimizada para buscar clientes com última mensagem
CREATE OR REPLACE FUNCTION public.get_clients_with_last_message()
RETURNS TABLE (
    id uuid,
    phone text,
    name text,
    age integer,
    gender text,
    height double precision,
    weight double precision,
    goal text,
    activity_level text,
    dietary_restrictions text,
    paid boolean,
    plan_url text,
    plan_text text,
    ai_enabled boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_context jsonb,
    last_message_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.phone,
        c.name,
        c.age,
        c.gender,
        c.height,
        c.weight,
        c.goal,
        c.activity_level,
        c.dietary_restrictions,
        c.paid,
        c.plan_url,
        c.plan_text,
        c.ai_enabled,
        c.created_at,
        c.updated_at,
        c.last_context,
        GREATEST(c.last_message_at, lm.last_msg_time) as last_message_at
    FROM public.clients c
    LEFT JOIN (
        SELECT 
            client_id,
            MAX(created_at) as last_msg_time
        FROM public.chat_messages
        GROUP BY client_id
    ) lm ON c.id = lm.client_id
    ORDER BY GREATEST(c.last_message_at, lm.last_msg_time) DESC NULLS LAST;
END;
$$;

-- 4. Função para marcar múltiplas mensagens como lidas (batch operation)
CREATE OR REPLACE FUNCTION public.mark_client_messages_read(p_client_id uuid)
RETURNS TABLE (success boolean, marked_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
    affected_rows integer;
BEGIN
    UPDATE public.chat_messages 
    SET read = true 
    WHERE client_id = p_client_id 
      AND role = 'user' 
      AND read = false;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN QUERY SELECT true as success, affected_rows as marked_count;
END;
$$;

-- 5. View materializada para estatísticas do dashboard (opcional - para performance em produção)
-- Esta view pode ser refrescada periodicamente para melhorar performance das estatísticas
/*
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.clients) as total_clients,
    (SELECT COUNT(*) FROM public.clients WHERE ai_enabled = true) as active_conversations,
    (SELECT COUNT(*) FROM public.pending_plans WHERE status = 'pending') as pending_plans,
    (SELECT COUNT(*) FROM public.chat_messages 
     WHERE created_at >= CURRENT_DATE) as today_messages,
    CURRENT_TIMESTAMP as last_updated;

-- Index para a view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_unique ON dashboard_stats (last_updated);

-- Função para refresh automático da view (chame esta função periodicamente)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_stats;
END;
$$;
*/

-- 6. Trigger para atualizar last_message_at automaticamente
CREATE OR REPLACE FUNCTION update_client_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.clients 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.client_id;
    
    RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_update_last_message ON public.chat_messages;
CREATE TRIGGER trigger_update_last_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_client_last_message();

-- 7. Análise das tabelas para otimizar o planner
ANALYZE public.chat_messages;
ANALYZE public.clients;
ANALYZE public.pending_plans;
ANALYZE public.conversations;

-- 8. Configurações recomendadas (apenas para referência - configure no Supabase Dashboard)
/*
-- Configurações PostgreSQL recomendadas para melhor performance:
-- shared_buffers = 256MB (ou 25% da RAM)
-- effective_cache_size = 1GB (ou 75% da RAM)
-- random_page_cost = 1.1 (para SSD)
-- seq_page_cost = 1.0
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
*/

-- 9. Query de verificação dos indexes criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('chat_messages', 'clients', 'pending_plans', 'conversations')
ORDER BY tablename, indexname; 