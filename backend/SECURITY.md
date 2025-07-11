# Documentação de Segurança - WhatsApp AI Bot

## 📋 Resumo das Implementações

### 1. **Rate Limiting** ✅
Implementado com `express-rate-limit` em diferentes níveis:
- **Geral**: 100 requisições/15min por IP
- **Autenticação**: 5 tentativas/15min
- **Webhook**: 30 mensagens/min
- **Envio de mensagens**: 10 mensagens/min por usuário
- **Criação de recursos**: 50 criações/hora
- **Consultas pesadas**: 10 consultas/5min

### 2. **Proteção de Rotas** ✅
- Autenticação JWT em todas as rotas protegidas
- Middleware `authenticateToken` validando tokens
- Diferentes níveis de acesso (admin/operator)
- Sessões expiram em 7 dias

### 3. **Políticas Supabase (RLS)** ✅
- Row Level Security habilitado em todas as tabelas
- Políticas específicas por tipo de usuário:
  - `authenticated`: Acesso de leitura básico
  - `service_role`: Acesso completo para backend
  - `app_user`: Permissões limitadas
- Usuários só podem ver seus próprios dados

### 4. **Headers de Segurança** ✅
- Helmet.js configurado com:
  - Content Security Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy
  - Permissions-Policy

### 5. **Validação e Sanitização** ✅
- Detecção de SQL Injection
- Limite de tamanho de payload (10MB)
- Remoção de headers perigosos
- Validação de origem (CORS)

### 6. **Proteção no Nginx** ✅
- Rate limiting por zona
- SSL/TLS com configuração moderna
- OCSP Stapling
- Bloqueio de bots maliciosos
- Proteção contra acesso a arquivos sensíveis

### 7. **Segurança na VPS** ✅
- UFW Firewall configurado
- Fail2ban para proteção contra força bruta
- SSH hardening (sem senha, sem root)
- Limites de sistema configurados
- Proteção kernel via sysctl

## 🔧 Configuração na VPS

### Passo 1: Execute o script de setup
```bash
sudo chmod +x vps-setup.sh
sudo ./vps-setup.sh
```

### Passo 2: Configure as variáveis de ambiente
```bash
cp .env.example .env
nano .env
```

Variáveis importantes:
- `ALLOWED_ORIGINS`: Domínios permitidos para CORS
- `ALLOWED_IPS`: IPs permitidos (opcional)
- `WEBHOOK_ALLOWED_IPS`: IPs da Z-API
- `JWT_SECRET`: String aleatória de pelo menos 32 caracteres
- `NODE_ENV`: Definir como "production"

### Passo 3: Configure o Supabase
Execute o arquivo SQL no painel do Supabase:
```bash
# No painel do Supabase > SQL Editor
# Cole e execute o conteúdo de supabase-policies.sql
```

### Passo 4: Configure o SSL
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Passo 5: Inicie a aplicação
```bash
cd /var/www/whatsapp-bot/backend
npm install
npm run build
pm2 start dist/index.js --name whatsapp-bot
pm2 save
```

## 🛡️ Monitoramento e Manutenção

### Logs
- Aplicação: `/var/log/whatsapp-bot/`
- Nginx: `/var/log/nginx/whatsapp-bot-*.log`
- Sistema: `journalctl -u whatsapp-bot`

### Monitoramento automático
- Script verifica a cada 5 minutos se o serviço está rodando
- Alertas para uso alto de CPU/memória/disco
- Logs são rotacionados automaticamente

### Backup
- Backup diário automático do código e variáveis
- Mantém últimos 7 dias
- Localização: `/var/backups/whatsapp-bot/`

## 🚨 Resposta a Incidentes

### Se detectar atividade suspeita:
1. Verifique os logs: `tail -f /var/log/nginx/whatsapp-bot-access.log`
2. Verifique IPs bloqueados: `sudo fail2ban-client status`
3. Bloqueie IP manualmente: `sudo ufw deny from IP_ADDRESS`
4. Verifique logs de auditoria no Supabase

### Rate limit atingido:
- Os limites podem ser ajustados em `rateLimitMiddleware.ts`
- Para IPs confiáveis, adicione em `ALLOWED_IPS`

## 📊 Métricas de Segurança

Monitore regularmente:
- Taxa de requisições bloqueadas
- Tentativas de login falhadas
- IPs bloqueados pelo Fail2ban
- Uso de recursos do servidor
- Logs de auditoria para ações sensíveis

## 🔐 Checklist de Segurança

- [ ] Senhas fortes em todas as contas
- [ ] 2FA habilitado no Supabase
- [ ] Chaves SSH configuradas
- [ ] Variáveis de ambiente seguras
- [ ] SSL certificado válido
- [ ] Backups testados
- [ ] Monitoramento ativo
- [ ] Plano de resposta a incidentes 