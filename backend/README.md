# WhatsApp AI Bot Backend

Este backend implementa um bot de WhatsApp para clientes que vendem planos de treino e nutrição, integrando Z-API (WhatsApp), Supabase (armazenamento de dados) e OpenAI (geração de planos).

## Tecnologias principais
- **Node.js + TypeScript**: Backend robusto e tipado
- **Express**: API HTTP e webhook para mensagens do WhatsApp
- **Supabase**: Banco de dados (PostgreSQL) para clientes, conversas e contexto
- **Z-API**: Integração com WhatsApp (envio/recebimento de mensagens)
- **OpenAI**: (Futuro) Geração automática de planos personalizados

## Fluxo de Conversa
1. **Início**: O bot cumprimenta o usuário e coleta informações (nome, idade, objetivo, gênero, altura, peso).
2. **Pagamento**: Após coletar os dados, o bot solicita o pagamento via Mbway.
3. **Confirmação de Pagamento**: O usuário envia o comprovativo ou mensagem de confirmação. O bot detecta automaticamente palavras-chave como "paguei", "comprovativo", "pago" etc.
4. **Plano Personalizado**: Após confirmação do pagamento, o bot avança para a geração/envio do plano (a ser implementado).

## Estrutura de Pastas
- `src/webhookHandler.ts`: Lógica principal do webhook, estados da conversa, integração com Supabase e Z-API.
- `src/services/zapi.ts`: Funções utilitárias para enviar mensagens via Z-API.

## Como funciona
- O webhook recebe mensagens do WhatsApp (via Z-API), identifica o usuário e o estado da conversa, e responde de acordo.
- O contexto do cliente é salvo no Supabase, permitindo conversas multi-etapas e personalizadas.
- O fluxo é controlado por uma máquina de estados simples (START, WAITING_FOR_INFO, WAITING_FOR_PAYMENT, PAID, SENT_PLAN).

## Como rodar localmente
1. Instale dependências: `npm install`
2. Configure variáveis de ambiente (`.env`):
   - `SUPABASE_URL`, `SUPABASE_KEY`, `ZAPI_URL`, `ZAPI_TOKEN`, etc.
3. Inicie o servidor: `npm run dev`
4. Exponha localmente (opcional): `ngrok http 3000`
5. Configure o webhook no painel da Z-API para apontar para sua URL pública.

## Observações
- O bot só pode enviar mensagens para usuários que iniciaram contato ou estão na lista de contatos do WhatsApp Business.
- O fluxo de pagamento Mbway pode ser expandido futuramente para integração automática.
- A geração e envio do plano personalizado será implementada na próxima etapa.