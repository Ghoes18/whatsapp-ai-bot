# Configuração do Realtime da Supabase

Este projeto agora usa o **Supabase Realtime** para atualizações em tempo real das mensagens e clientes, substituindo o sistema anterior de WebSockets.

## Configuração Necessária

### 1. Variáveis de Ambiente (Frontend)

Certifique-se de que seu arquivo `.env` na pasta `frontend/` contenha as seguintes variáveis:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_publica

# Outras variáveis que você já tem
VITE_API_BASE_URL=http://localhost:3000/api/dashboard
NODE_ENV=development
OPENAI_API_KEY=sua_chave_openai
ZAPI_URL=https://api.z-api.io
ZAPI_CLIENT_TOKEN=seu_token_zapi
```

**Nota**: O sistema usa `SUPABASE_URL` e `SUPABASE_ANON_KEY` (sem prefixo VITE_).

### 2. Configuração do Supabase

#### Habilitar Realtime no Supabase

1. Acesse o painel do Supabase
2. Vá para **Settings** > **API**
3. Copie a **URL** e **anon public key**
4. Vá para **Database** > **Replication**
5. Habilite Realtime nas tabelas:
   - `chat_messages`
   - `clients`

#### RLS (Row Level Security)

Certifique-se de que as policies de RLS estão configuradas corretamente para permitir acesso às tabelas via Realtime.

## Funcionalidades Implementadas

### ✅ Mensagens em Tempo Real
- **Novas mensagens**: Aparecem automaticamente na conversa ativa
- **Atualizações**: Mensagens marcadas como lidas são atualizadas em tempo real
- **Cache inteligente**: Sistema de cache com invalidação automática

### ✅ Lista de Clientes em Tempo Real
- **Novos clientes**: Adicionados automaticamente à lista
- **Atualizações**: Informações do cliente (nome, última mensagem) atualizadas em tempo real
- **Status de conexão**: Indicador visual da conexão Realtime

### ✅ Notificações Otimizadas
- **Contadores em tempo real**: Mensagens não lidas atualizadas instantaneamente
- **Decremento otimizado**: Quando mensagens são marcadas como lidas
- **Fallback**: Sistema de polling como backup (30 segundos)

## Como Funciona

### 1. Serviço de Realtime (`supabaseClient.ts`)

```typescript
// Singleton para gerenciar subscriptions
export class RealtimeService {
  // Subscrições organizadas por tipo e cliente
  private subscriptions: Map<string, RealtimeChannel>
  
  // Métodos principais:
  subscribeToClientMessages(clientId, onNew, onUpdate)
  subscribeToClientsUpdates(onUpdate)
  subscribeToAllMessages(onNew)
}
```

### 2. Hook de Notificações (`useNotifications.ts`)

- Escuta **todas** as mensagens via Realtime
- Atualiza contadores de não lidas automaticamente
- Mantém polling como backup para garantir consistência

### 3. Componente Conversations (`Conversations.tsx`)

- Subscrições específicas por cliente ativo
- Handlers para novas mensagens e atualizações
- Indicador visual da conexão Realtime
- Cache com invalidação automática

## Benefícios vs WebSockets

### ✅ Vantagens do Supabase Realtime

1. **Nativo ao banco**: Escuta mudanças diretamente no PostgreSQL
2. **Menos infraestrutura**: Não precisa de servidor WebSocket separado
3. **Melhor performance**: Filtragem no banco, não no cliente
4. **Reconexão automática**: Gerenciada pelo cliente Supabase
5. **Type-safe**: Tipos TypeScript automáticos
6. **Menos código**: API mais simples que WebSockets

### 🔄 Comparação

| Aspecto | WebSockets | Supabase Realtime |
|---------|------------|-------------------|
| Setup | Servidor dedicado | Configuração simples |
| Filtragem | Cliente | Banco de dados |
| Reconexão | Manual | Automática |
| Types | Manual | Automático |
| Performance | Depende impl. | Otimizado |

## Debugging

### Logs no Console

O sistema gera logs detalhados para debugging:

```
✅ Supabase configurado com sucesso: { url: "...", hasKey: true }
🔔 Subscrevendo mensagens do cliente: uuid
📨 Nova mensagem recebida via Realtime: {...}
📝 Mensagem atualizada via Realtime: {...}
👤 Cliente atualizado via Realtime: {...}
🔕 Removendo subscription: messages_uuid
```

### Indicador Visual

- **🟢 Verde**: Conectado ao Realtime
- **🔴 Vermelho**: Desconectado do Realtime

### Verificar Conexão

```typescript
import { realtimeService } from './services/supabaseClient'

console.log(realtimeService.getConnectionStatus())
// "connected" ou "disconnected"
```

## Troubleshooting

### 1. Realtime não conecta

- Verificar URLs e chaves no `.env`
- Verificar se Realtime está habilitado no Supabase
- Verificar console para erros de autenticação

### 2. Mensagens não aparecem em tempo real

- Verificar RLS policies
- Verificar se a tabela tem Realtime habilitado
- Verificar logs no console

### 3. Performance

- Cache inteligente reduz requests desnecessários
- Polling de backup garante consistência
- Subscriptions são limpas automaticamente

## Próximos Passos

- [ ] Adicionar typing indicators em tempo real
- [ ] Implementar presence (usuários online)
- [ ] Adicionar notificações push
- [ ] Otimizar queries com índices específicos 