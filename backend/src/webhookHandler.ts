import { Request, Response, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { sendWhatsappMessage } from "./services/zapi";
import fs from 'fs';
import path from 'path';
import { generateTrainingPlan, askQuestionToAI } from './services/openaiService';
import { generatePlanPDF } from './services/pdfService';
import { getOrCreateClient, getActiveConversation, updateConversationContext, updateClientAfterPayment, supabase, savePlanText } from './services/supabaseService';

dotenv.config();

// Estados possíveis do cliente
const STATES = {
  START: "START",
  WAITING_FOR_INFO: "WAITING_FOR_INFO",
  WAITING_FOR_PAYMENT: "WAITING_FOR_PAYMENT",
  PAID: "PAID",
  SENT_PLAN: "SENT_PLAN",
  QUESTIONS: "QUESTIONS",
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
    const client = await getOrCreateClient(from);
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
      case STATES.QUESTIONS:
        await handleQuestionsState(from, text, conversation);
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

    // Salvar texto do plano no banco
    await savePlanText(conversation.client_id, plano);

    // Gerar PDF
    const pdfPath = path.join(__dirname, `plano_${from}.pdf`);
    await generatePlanPDF(context, plano, pdfPath);

    // Upload para Supabase Storage
    const pdfData = fs.readFileSync(pdfPath);
    const fileName = `planos/plano_${from}_${Date.now()}.pdf`;
    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (error) {
      console.error('Erro ao fazer upload do PDF:', error);
      await sendWhatsappMessage(from, 'Erro ao enviar seu plano em PDF. Tente novamente mais tarde.');
      fs.unlink(pdfPath, () => {});
      return;
    }

    // Gerar URL pública
    const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl;
    if (publicUrl) {
      await sendWhatsappMessage(from, `Seu plano personalizado em PDF está pronto! Baixe aqui: ${publicUrl}`);
      await updateClientAfterPayment(conversation.client_id, publicUrl, context);
      // Atualizar estado da conversa para QUESTIONS
      await supabase
        .from('conversations')
        .update({ state: STATES.QUESTIONS })
        .eq('id', conversation.id);
      await sendWhatsappMessage(from, 'Agora você pode tirar dúvidas sobre seu plano! Envie sua pergunta.');
    } else {
      await sendWhatsappMessage(from, 'Seu plano foi gerado, mas não foi possível obter o link do PDF.');
    }

    // Limpar PDF temporário
    fs.unlink(pdfPath, () => {});
  } catch (error) {
    console.log("Erro no estado PAID:", error);
    console.error('Erro ao gerar/enviar plano:', error);
    await sendWhatsappMessage(from, `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  }
}

// Adicionar handler para o estado QUESTIONS
async function handleQuestionsState(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    if (!text.trim()) {
      await sendWhatsappMessage(from, 'Por favor, envie sua dúvida sobre o plano.');
      return;
    }
    const resposta = await askQuestionToAI(conversation.client_id, context, text);
    await sendWhatsappMessage(from, resposta);
  } catch (error) {
    console.error('Erro ao responder dúvida:', error);
    await sendWhatsappMessage(from, 'Ocorreu um erro ao responder sua dúvida. Tente novamente mais tarde.');
  }
}
