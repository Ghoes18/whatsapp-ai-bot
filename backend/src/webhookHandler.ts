import { Request, Response, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { sendWhatsappMessage } from "./services/zapi";
import fs from 'fs';
import path from 'path';
import { generateTrainingPlan } from './services/openaiService';
import { generatePlanPDF } from './services/pdfService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Estados possíveis do cliente
const STATES = {
  START: "START",
  WAITING_FOR_INFO: "WAITING_FOR_INFO",
  WAITING_FOR_PAYMENT: "WAITING_FOR_PAYMENT",
  PAID: "PAID",
  SENT_PLAN: "SENT_PLAN",
} as const;
type State = typeof STATES[keyof typeof STATES];

// Tipo para o contexto do cliente
interface ClientContext {
  name?: string;
  age?: string;
  goal?: string;
  gender?: string;
  height?: string;
  weight?: string;
  [key: string]: any;
}

// Handler principal do webhook
export const handleWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const message = req.body || {};

    // EVITAR LOOP: Ignore mensagens enviadas pelo próprio bot
    if (message.fromMe || message.fromApi) {
      res.status(200).send('Mensagem do bot ignorada');
      return;
    }

    // Extrair dados principais
    const from: string | undefined = message.phone || message.from;
    const text: string = message.text?.message || message.body || '';

    if (!from) {
      console.log("❌ ERRO: Número do remetente não encontrado na mensagem");
      res.status(400).send("Número do remetente não encontrado");
      return;
    }
    if (!text.trim()) {
      res.status(200).send("Mensagem vazia ignorada");
      return;
    }

    // Buscar ou criar cliente
    const client = await getOrCreateClient(from, res);
    if (!client) return;

    // Buscar conversa ativa
    const conversation = await getActiveConversation(client.id);
    let userState: State = conversation?.state || STATES.START;

    // Processar de acordo com o estado
    switch (userState) {
      case STATES.START:
        await handleStartState(from, client.id);
        break;
      case STATES.WAITING_FOR_INFO:
        await handleWaitingForInfo(from, text, conversation);
        break;
      case STATES.WAITING_FOR_PAYMENT:
        await handleWaitingForPayment(from, text, conversation);
        break;
      case STATES.PAID:
        await handlePaidState(from, conversation);
        break;
      default:
        await handleStartState(from, client.id);
    }

    res.status(200).send("Webhook processado");
  } catch (error) {
    console.error("ERRO GERAL no webhook:", error);
    res.status(500).send("Erro interno do servidor");
  }
};

// Busca ou cria cliente
async function getOrCreateClient(phone: string, res: Response) {
  try {
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", phone)
      .single();
    if (client) {
      return client;
    }
    if (error && error.code !== 'PGRST116') {
      console.log("Erro ao buscar cliente:", error);
      res.status(500).send("Erro ao buscar cliente");
      return null;
    }
    // Criar cliente se não existir
    const { data: newClient, error: newClientError } = await supabase
      .from("clients")
      .insert([{ phone }])
      .select()
      .single();
    if (newClientError) {
      console.log("Erro ao criar cliente:", newClientError);
      res.status(500).send("Erro ao criar cliente");
      return null;
    }
    return newClient;
  } catch (error) {
    console.log("Erro na busca/criação do cliente:", error);
    res.status(500).send("Erro ao processar cliente");
    return null;
  }
}

// Busca conversa ativa
async function getActiveConversation(clientId: string) {
  try {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.log("Erro ao buscar conversa:", error);
    }
    return conversation;
  } catch (error) {
    console.log("Erro na busca da conversa:", error);
    return null;
  }
}

// Inicia o fluxo perguntando o nome
async function handleStartState(from: string, clientId: string) {
  try {
    const { data: newConv, error: newConvError } = await supabase
      .from("conversations")
      .insert([
        {
          client_id: clientId,
          state: STATES.WAITING_FOR_INFO,
          context: {},
        },
      ])
      .select()
      .single();
    if (newConvError) {
      console.log("Erro ao criar conversa:", newConvError);
      return;
    }
    await sendWhatsappMessage(from, "Olá! Qual seu nome?");
  } catch (error) {
    console.log("Erro no estado START:", error);
  }
}

// Coleta informações do cliente
async function handleWaitingForInfo(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    if (!context.name) {
      context.name = text;
      await updateConversationContext(conversation?.id, context);
      await sendWhatsappMessage(from, `Prazer, ${text}! Qual sua idade?`);
    } else if (!context.age) {
      context.age = text;
      await updateConversationContext(conversation?.id, context);
      await sendWhatsappMessage(from, "Qual seu objetivo principal? (ex: emagrecer, ganhar massa, etc)");
    } else if (!context.goal) {
      context.goal = text;
      await updateConversationContext(conversation?.id, context);
      await sendWhatsappMessage(from, "Perfeito! Agora preciso de mais algumas informações:");
      await sendWhatsappMessage(from, "Qual seu gênero? (masculino/feminino)");
    } else if (!context.gender) {
      context.gender = text;
      await updateConversationContext(conversation?.id, context);
      await sendWhatsappMessage(from, "Qual sua altura em cm? (ex: 175)");
    } else if (!context.height) {
      context.height = text;
      await updateConversationContext(conversation?.id, context);
      await sendWhatsappMessage(from, "Qual seu peso atual em kg? (ex: 70)");
    } else if (!context.weight) {
      context.weight = text;
      await updateConversationContext(conversation?.id, context);
      // Todas as informações coletadas - avançar para pagamento
      await supabase
        .from("conversations")
        .update({ state: STATES.WAITING_FOR_PAYMENT })
        .eq("id", conversation?.id);
      await sendWhatsappMessage(from, `Obrigado ${context.name}! Agora você receberá o link para pagamento via Mbway.`);
      await sendWhatsappMessage(from, "💳 Link de pagamento: [IMPLEMENTAR MBWAY]");
    } else {
      await sendWhatsappMessage(from, "Suas informações já foram coletadas. Aguarde o processamento.");
    }
  } catch (error) {
    console.log("Erro no estado WAITING_FOR_INFO:", error);
  }
}

// Estado de pagamento
async function handleWaitingForPayment(from: string, text: string, conversation: any) {
  // Simples detecção de confirmação de pagamento | ALERTA: APENAS PARA TESTES DEPOIS APLICAR A API DO IFTHENPAY
  if (/pag(uei|amento)|comprovativo|pago|feito|transfer/i.test(text)) {
    await supabase
      .from("conversations")
      .update({ state: STATES.PAID })
      .eq("id", conversation?.id);
    await sendWhatsappMessage(from, "Pagamento confirmado! Em instantes você receberá seu plano personalizado.");
    await handlePaidState(from, conversation); // Avança para o próximo estado
    return;
  }
  await sendWhatsappMessage(from, "Para finalizar, envie o comprovativo do pagamento Mbway para este número ou clique no link: [LINK_DO_MBWAY]");
}

// Estado pago
async function handlePaidState(from: string, conversation: any) {
  try {
    const context = conversation?.context;
    if (!context) {
      await sendWhatsappMessage(from, 'Não foi possível encontrar seus dados para gerar o plano.');
      return;
    }

    // Gerar plano com OpenAI
    const plano = await generateTrainingPlan(context);

    // Gerar PDF
    const pdfPath = path.join(__dirname, `plano_${from}.pdf`);
    await generatePlanPDF(context, plano, pdfPath);

    // Enviar PDF ao usuário (A Z-API não suporta envio direto de arquivos, então envie um link ou mensagem informando)
    await sendWhatsappMessage(from, 'Seu plano personalizado está pronto! (Funcionalidade de envio de PDF em desenvolvimento)');
    // Exemplo: await sendWhatsappMessage(from, `Baixe seu plano aqui: [LINK_DO_PDF]`);

    // Limpar PDF temporário
    fs.unlink(pdfPath, () => {});
  } catch (error) {
    console.error('Erro ao gerar/enviar plano:', error);
    await sendWhatsappMessage(from, 'Ocorreu um erro ao gerar seu plano. Tente novamente mais tarde.');
  }
}

// Atualiza o contexto da conversa
async function updateConversationContext(conversationId: string, context: ClientContext) {
  if (!conversationId) {
    console.log("ERRO: ID da conversa não fornecido");
    return;
  }
  try {
    const { error } = await supabase
      .from("conversations")
      .update({ context })
      .eq("id", conversationId);
    if (error) {
      console.log("Erro ao atualizar contexto:", error);
    }
  } catch (error) {
    console.log("Erro na atualização do contexto:", error);
  }
}
