# 🤖 WhatsApp AI Bot - FitAI

Um bot inteligente para WhatsApp que oferece planos personalizados de treino e nutrição, com dashboard de administração completo e sistema de chat com IA.

## 📋 Visão Geral

O **FitAI WhatsApp Bot** é uma solução completa para profissionais de fitness que desejam automatizar a criação e entrega de planos personalizados de treino e nutrição através do WhatsApp. O sistema coleta informações dos clientes, gera planos personalizados usando IA, processa pagamentos e oferece suporte contínuo.

### ✨ Principais Funcionalidades

- 🎯 **Coleta Inteligente de Dados**: Questionário interativo via WhatsApp com botões e formulários
- 🧠 **Geração de Planos com IA**: Planos personalizados usando OpenAI GPT-4
- 🏥 **⚠️ NOVO: Proteção para Clientes com Problemas de Saúde**: Planos não são gerados automaticamente por IA se o cliente reportar condições de saúde
- 💳 **Processamento de Pagamentos**: Integração com MBway (implementável)
- 📊 **Dashboard Administrativo**: Interface completa para gestão de clientes e conversas
- 💬 **Chat IA Administrativo**: Análise de dados e consultas via IA
- 🌙 **Modo Escuro**: Interface moderna com suporte a dark mode
- 📱 **Responsivo**: Funciona perfeitamente em desktop e mobile
- 🔄 **Suporte Humano**: Sistema de escalação para atendimento manual

## 🏥 **NOVA FUNCIONALIDADE: Proteção de Clientes com Problemas de Saúde**

### 🎯 **Como Funciona**
Por questões de segurança e responsabilidade profissional, o sistema agora:

1. **Detecta automaticamente** quando um cliente reporta problemas de saúde
2. **Impede a geração automática** de planos por IA para estes casos
3. **Encaminha para revisão manual obrigatória** por um profissional qualificado
4. **Envia mensagens específicas** explicando o processo diferenciado

### 🔍 **Detecção Inteligente**
O sistema reconhece quando o cliente **NÃO** tem problemas:
- "nenhuma", "nenhum", "não", "sem problemas", "saudável", "normal", "ok", etc.

E quando **TEM** problemas de saúde:
- "hipertensão", "diabetes", "lesão", "dor", "cirurgia", "medicação", etc.

### 💬 **Mensagens Diferenciadas**
Para clientes com problemas de saúde, o sistema envia:
- 🏥 "Detetámos que tem condições de saúde que requerem atenção especial"
- 👨‍⚕️ "Por questões de segurança, o seu plano será criado manualmente por um profissional qualificado"
- 📋 "Este processo assegura que todas as suas condições de saúde são devidamente consideradas"

### 📊 **Dashboard Melhorado**
- ⚠️ **Badge vermelho** "Revisão Manual" para planos com problemas de saúde
- 🏥 **Alerta destacado** mostrando as condições de saúde reportadas
- 👨‍⚕️ **Priorização visual** para facilitar identificação pelos administradores

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │◄──►│   Z-API         │◄──►│   Backend       │
│   (Cliente)     │    │   (Gateway)     │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐             │
                       │   OpenAI        │◄────────────┤
                       │   (GPT-4)       │             │
                       └─────────────────┘             │
                                                       │
┌─────────────────┐    ┌─────────────────┐             │
│   Dashboard     │◄──►│   Frontend      │◄────────────┤
│   (Admin)       │    │   (React)       │             │
└─────────────────┘    └─────────────────┘             │
                                                       │
                       ┌─────────────────┐             │
                       │   Supabase      │◄────────────┘
                       │   (Database)    │
                       └─────────────────┘
```

## 🛠️ Stack Tecnológica

### Backend
- **Node.js** + **TypeScript** - Runtime e tipagem
- **Express.js** - Framework web
- **Socket.IO** - Comunicação em tempo real
- **Supabase** - Banco de dados PostgreSQL
- **OpenAI API** - Geração de conteúdo com IA
- **Z-API** - Integração com WhatsApp
- **PDFKit** - Geração de PDFs

### Frontend
- **React 19** + **TypeScript** - Interface de usuário
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **React Router** - Roteamento
- **Heroicons** - Ícones
- **Date-fns** - Manipulação de datas

### Integrações
- **Z-API** - Gateway para WhatsApp Business
- **OpenAI GPT-4** - Inteligência artificial
- **Supabase** - Banco de dados e autenticação
- **MBway** - Processamento de pagamentos (configurável)

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta na OpenAI
- Conta na Z-API (WhatsApp Business)

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/whatsapp-ai-bot.git
cd whatsapp-ai-bot
```

### 2. Configuração do Backend
```bash
cd backend
npm install
```

Crie o arquivo `.env`:
```env
# Servidor
PORT=3000

# Supabase
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase

# OpenAI
OPENAI_API_KEY=sua_chave_openai

# Z-API (WhatsApp)
ZAPI_URL=sua_url_zapi
ZAPI_CLIENT_TOKEN=seu_token_zapi

# Outros
NODE_ENV=development
```

### 3. Configuração do Frontend
```bash
cd frontend
npm install
```

Crie o arquivo `.env`:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
VITE_API_URL=http://localhost:3000
```

### 4. Configuração do Banco de Dados

Execute o schema SQL no Supabase:
```bash
# Execute o conteúdo de backend/databaseSchema.sql no SQL Editor do Supabase
```

### 5. Executar o Sistema

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## 💬 Fluxo de Conversação

### 1. Coleta de Informações
O bot coleta as seguintes informações dos clientes:

1. **Nome** - Identificação pessoal
2. **Idade** - Faixa etária
3. **Objetivo** - Meta principal (emagrecer, ganhar massa, etc.)
4. **Gênero** - Personalização biológica
5. **Altura/Peso** - Dados biométricos
6. **Experiência** - Nível de treino (botões interativos)
7. **Dias Disponíveis** - Frequência de treino (botões interativos)
8. **Condições de Saúde** - Limitações médicas
9. **Preferências de Exercício** - Tipos preferidos (botões interativos)
10. **Restrições Alimentares** - Limitações dietéticas
11. **Equipamento** - Recursos disponíveis
12. **Motivação** - Drivers principais

### 2. Processamento de Pagamento
- Envio de link MBway
- Detecção automática de confirmação
- Validação de comprovativo

### 3. Geração do Plano
- Análise de dados coletados
- Geração personalizada via OpenAI
- Criação de PDF profissional
- Entrega via WhatsApp

### 4. Suporte Contínuo
- Chat inteligente para dúvidas
- Detecção de solicitações de suporte humano
- Escalação automática quando necessário

## 📊 Dashboard Administrativo

### Funcionalidades Principais

- **📈 Dashboard Principal**
  - Estatísticas em tempo real
  - Gráficos de atividade
  - Resumo de pagamentos
  - Atividade recente

- **💬 Conversas**
  - Histórico completo de chats
  - Busca por cliente
  - Status das conversações
  - Chat em tempo real

- **👥 Perfis de Clientes**
  - Informações detalhadas
  - Histórico de planos
  - Status de pagamento
  - Dados biométricos

- **📋 Planos Pendentes**
  - Revisão antes do envio
  - Aprovação/rejeição
  - Edição de conteúdo
  - Controle de qualidade

- **🆘 Suporte Humano**
  - Solicitações pendentes
  - Atribuição de atendentes
  - Histórico de resoluções
  - Notas internas

- **🤖 Chat IA Administrativo**
  - Consultas à base de dados
  - Análise de métricas
  - Geração de relatórios
  - Insights automáticos

## 🎨 Interface do Usuário

### Características do Design
- **🌙 Dark Mode Completo** - Alternância automática e manual
- **📱 Design Responsivo** - Otimizado para todas as telas
- **🎯 UX Moderna** - Interface intuitiva e profissional
- **⚡ Performance** - Carregamento rápido e fluido
- **🔔 Notificações** - Feedback visual em tempo real

### Componentes Principais
- Sidebar navegável com indicadores visuais
- Cards informativos com métricas
- Tabelas avançadas com filtros
- Modais para ações detalhadas
- Chat interface em tempo real

## 🔧 API e Endpoints

### Webhook WhatsApp
```
POST /webhook - Recebe mensagens do WhatsApp
```

### Dashboard API
```
GET /api/dashboard/stats - Estatísticas gerais
GET /api/dashboard/activity - Atividade recente
GET /api/dashboard/pending-plans - Planos pendentes
POST /api/dashboard/approve-plan - Aprovar plano
POST /api/dashboard/reject-plan - Rejeitar plano
```

### Clientes
```
GET /api/clients - Lista de clientes
GET /api/clients/:id - Detalhes do cliente
PUT /api/clients/:id - Atualizar cliente
```

### Conversas
```
GET /api/conversations - Lista de conversas
GET /api/conversations/:id - Detalhes da conversa
POST /api/conversations/:id/message - Enviar mensagem
```

## 📊 Base de Dados

### Tabelas Principais

- **clients** - Informações dos clientes
- **conversations** - Conversas ativas
- **chat_messages** - Histórico de mensagens
- **plans** - Planos gerados
- **pending_plans** - Planos aguardando aprovação
- **human_support_requests** - Solicitações de suporte
- **admin_conversations** - Conversas administrativas
- **admin_chat_messages** - Chat IA administrativo

## 🔒 Segurança

- **Autenticação** via Supabase
- **Rate Limiting** para APIs
- **Validação** de dados de entrada
- **Sanitização** de conteúdo
- **CORS** configurado adequadamente
- **Headers** de segurança

## 📈 Monitoramento

### Logs
- Todas as interações são logadas
- Erros são capturados e registrados
- Performance é monitorizada

### Métricas
- Tempo de resposta
- Taxa de conversão
- Satisfação do cliente
- Uso de recursos

## 🚀 Deploy

### Backend (Heroku/Railway/VPS)
```bash
# Build da aplicação
npm run build

# Configurar variáveis de ambiente
# Definir WEBHOOK_URL na Z-API
```

### Frontend (Vercel/Netlify)
```bash
# Build da aplicação
npm run build

# Deploy automático via Git
```

## 📋 Roadmap

### Próximas Funcionalidades
- [ ] Integração com mais gateways de pagamento
- [ ] Sistema de agendamento de consultas
- [ ] Análise de progresso dos clientes
- [ ] Integração com wearables
- [ ] Sistema de referências/afiliados
- [ ] API pública para integrações
- [ ] Versão mobile nativa

### Melhorias Técnicas
- [x] Testes automatizados
- [ ] Docker containers
- [ ] CI/CD pipeline
- [ ] Métricas avançadas
- [ ] Cache distribuído
- [ ] CDN para assets

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 🧪 Testes

O projeto agora inclui testes automatizados completos para garantir a qualidade e confiabilidade do código.

### Backend (Jest + TypeScript)
```bash
cd backend
npm test
```

**Cobertura de Testes:**
- ✅ **Detecção de Condições de Saúde** - Verifica se o sistema identifica corretamente clientes com problemas de saúde
- ✅ **Geração de Planos** - Testa a criação de planos personalizados via IA
- ✅ **Mocking OpenAI** - Testes rápidos sem chamadas reais à API

### Frontend (Vitest + React Testing Library)
```bash
cd frontend
npm test
```

**Cobertura de Testes:**
- ✅ **Renderização de Componentes** - Testa se os componentes são renderizados corretamente
- ✅ **Interações do Usuário** - Verifica cliques, formulários e navegação
- ✅ **Integração com Providers** - Testa contextos (Auth, Theme) e estados

### Estrutura de Testes
```
backend/
├── jest.config.ts          # Configuração Jest
└── tests/
    └── openaiService.test.ts # Testes do serviço de IA

frontend/
├── vitest.config.ts         # Configuração Vitest
├── tests/
│   ├── setup.ts            # Setup global (mocks, matchers)
│   └── AdminAIChat.test.tsx # Testes do chat admin
```

### Executar Todos os Testes
```bash
# Backend
cd backend && npm test

# Frontend  
cd frontend && npm test
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipa

Desenvolvido com ❤️ por [@Ghoes18](https://github.com/Ghoes18)

---

⭐ **Se este projeto foi útil, não esqueça de dar uma estrela!**
