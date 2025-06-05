import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Debug da variável de ambiente
console.log('ZAPI_URL carregada:', process.env.ZAPI_URL);

const ZAPI_URL = process.env.ZAPI_URL;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

if (!ZAPI_URL) {
  console.error('ERRO: ZAPI_URL não está definida no arquivo .env');
  throw new Error('ZAPI_URL não configurada');
}
if (!ZAPI_CLIENT_TOKEN) {
  throw new Error('ZAPI_CLIENT_TOKEN não configurado');
}

// Configuração base do axios
const zapi = axios.create({
  baseURL: ZAPI_URL,
  headers: {
    'Content-Type': 'application/json',
    'Client-Token': ZAPI_CLIENT_TOKEN,
  },
});

// Enviar mensagem de texto
export async function sendWhatsappMessage(phone: string, message: string) {
  try {
    console.log('Enviando mensagem para:', phone);
    const response = await zapi.post('/send-text', { phone, message });
    console.log('Resposta da Z-API:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem via Z-API:', error);
    throw error;
  }
}

// Enviar imagem
export async function sendImage(phone: string, imageUrl: string, caption?: string) {
  try {
    const response = await zapi.post('/send-image', {
      phone,
      image: imageUrl,
      caption,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar imagem via Z-API:', error);
    throw error;
  }
}

// Enviar documento
export async function sendDocument(phone: string, documentUrl: string, filename: string) {
  try {
    const response = await zapi.post('/send-document', {
      phone,
      document: documentUrl,
      filename,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar documento via Z-API:', error);
    throw error;
  }
}

// Enviar áudio
export async function sendAudio(phone: string, audioUrl: string) {
  try {
    const response = await zapi.post('/send-audio', {
      phone,
      audio: audioUrl,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar áudio via Z-API:', error);
    throw error;
  }
}

// Enviar notificação de digitação
export async function sendTyping(phone: string, isTyping: boolean) {
  try {
    const response = await zapi.post('/typing', {
      phone,
      typing: isTyping,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar status de digitação via Z-API:', error);
    throw error;
  }
}

// Verificar status da mensagem
export async function getMessageStatus(messageId: string) {
  try {
    const response = await zapi.get(`/message-status/${messageId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar status da mensagem via Z-API:', error);
    throw error;
  }
}

// Marcar mensagem como lida
export async function markMessageAsRead(messageId: string) {
  try {
    const response = await zapi.post('/read-message', { messageId });
    return response.data;
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida via Z-API:', error);
    throw error;
  }
}

// Obter informações do contato
export async function getContactInfo(phone: string) {
  try {
    const response = await zapi.get(`/contact-info/${phone}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter informações do contato via Z-API:', error);
    throw error;
  }
}
