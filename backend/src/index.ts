import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handleWebhook } from './webhookHandler';
import dashboardRoutes from './dashboardRoutes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL do frontend
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Handlers para prevenir crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Não encerrar o processo em desenvolvimento
  // process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Não encerrar o processo em desenvolvimento
  // process.exit(1);
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentar limite para webhooks grandes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para log simplificado de webhooks
app.use('/webhook', (req, res, next) => {
  const message = req.body?.message || req.body;
  const phone = message?.phone || 'Unknown';
  const text = message?.text?.message || message?.buttonsResponseMessage?.buttonId || 'No text';
  const fromMe = message?.fromMe || false;
  
  // Só logar mensagens recebidas (não enviadas pelo bot)
  if (!fromMe) {
    console.log(`📱 ${phone}: "${text}"`);
  }
  next();
});

// Middleware para log de requisições não-webhook (simplificado)
app.use((req, res, next) => {
  if (!req.path.includes('/webhook') && !req.path.includes('/health')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Endpoint de teste para verificar se o ngrok está funcionando
app.get('/test', (req, res) => {
  const testData = {
    status: 'SUCCESS',
    message: 'Ngrok está funcionando corretamente!',
    timestamp: new Date().toISOString(),
    server: 'WhatsApp AI Bot Backend',
    ip: req.ip,
    headers: req.headers
  };
  
  console.log('🧪 Teste de conectividade realizado');
  res.status(200).json(testData);
});

// Endpoint específico para teste do webhook Z-API
app.post('/test-webhook', (req, res) => {
  console.log('🧪 Webhook de teste recebido');
  
  res.status(200).json({
    status: 'SUCCESS',
    message: 'Webhook de teste recebido com sucesso!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Rotas
app.post('/webhook', handleWebhook);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint para verificar configuração do webhook
app.get('/webhook-info', (req, res) => {
  res.status(200).json({
    webhookUrl: `${req.protocol}://${req.get('host')}/webhook`,
    testUrl: `${req.protocol}://${req.get('host')}/test`,
    testWebhookUrl: `${req.protocol}://${req.get('host')}/test-webhook`,
    healthUrl: `${req.protocol}://${req.get('host')}/health`,
    timestamp: new Date().toISOString(),
    instructions: {
      'Z-API Configuration': {
        'Webhook URL': `${req.protocol}://${req.get('host')}/webhook`,
        'Method': 'POST',
        'Content-Type': 'application/json'
      },
      'Testing': {
        'Test connectivity': `GET ${req.protocol}://${req.get('host')}/test`,
        'Test webhook': `POST ${req.protocol}://${req.get('host')}/test-webhook`
      }
    }
  });
});

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-client-room', (clientId) => {
    socket.join(`client-${clientId}`);
    console.log(`Socket ${socket.id} entrou na sala do cliente ${clientId}`);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exportar io para uso em outros módulos
export { io };

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log(`ℹ️  Webhook info: http://localhost:${PORT}/webhook-info`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    process.exit(0);
  });
});