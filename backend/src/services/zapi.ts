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

export async function sendWhatsappMessage(phone: string, message: string) {
  try {
    console.log('Enviando mensagem para:', phone);
    console.log('URL da API:', `${ZAPI_URL}/send-text`);
    
    const response = await axios.post(
      `${ZAPI_URL}/send-text`,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN,
        },
      }
    );
    console.log('Resposta da Z-API:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem via Z-API:', error);
    throw error;
  }
}
