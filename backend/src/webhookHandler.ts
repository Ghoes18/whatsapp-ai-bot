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

// Função helper para salvar mensagens enviadas pelo bot
async function saveAssistantMessage(clientId: string, content: string) {
  try {
    const { error: messageError } = await supabase.from("chat_messages").insert([
      {
        client_id: clientId,
        role: "assistant",
        content: content,
      },
    ]);

    if (messageError) {
      console.error("Erro ao salvar mensagem do assistente:", messageError);
    } else {
      console.log('Mensagem do assistente salva com sucesso');
    }
  } catch (error) {
    console.error('Erro ao salvar mensagem do assistente:', error);
  }
}

// Handler principal do webhook
export const handleWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("=== WEBHOOK RECEBIDO ===");
    console.log("Headers:", req.headers);
    console.log("Body completo:", JSON.stringify(req.body, null, 2));

    // Tentar diferentes estruturas de mensagem que o ZAPI pode enviar
    let message = req.body.message;
    
    // Se não encontrou 'message', tentar outras estruturas possíveis
    if (!message) {
      console.log("❌ Campo 'message' não encontrado, tentando estruturas alternativas...");
      
      // Verificar se é uma estrutura direta
      if (req.body.phone || req.body.from || req.body.remoteJid) {
        message = req.body;
        console.log("✅ Usando req.body diretamente como mensagem");
      }
      // Verificar outras possíveis estruturas
      else if (req.body.data?.message) {
        message = req.body.data.message;
        console.log("✅ Encontrado em req.body.data.message");
      }
      else if (req.body.webhook?.message) {
        message = req.body.webhook.message;
        console.log("✅ Encontrado em req.body.webhook.message");
      }
      else {
        console.log("❌ ERRO: Estrutura de mensagem não reconhecida");
        console.log("Campos disponíveis no body:", Object.keys(req.body));
        res.status(400).send("Estrutura de mensagem inválida");
        return;
      }
    }

    console.log("📱 Mensagem processada:", JSON.stringify(message, null, 2));

    // Extrair dados principais com mais flexibilidade
    const from: string | undefined = 
      message.phone || 
      message.from || 
      message.remoteJid || 
      message.sender ||
      message.chatId;
      
    const text: string = 
      message.text?.message || 
      message.body || 
      message.content ||
      message.text ||
      message.message ||
      '';

    console.log("📋 Dados extraídos:", { from, text });

    // Verificar se é realmente uma mensagem de texto (ignorar status, typing, etc.)
    if (message.messageType && message.messageType !== 'textMessage') {
      console.log(`📄 Ignorando mensagem do tipo: ${message.messageType}`);
      res.status(200).send("Tipo de mensagem não suportado");
      return;
    }

    // Ignorar webhooks de status de mensagem (entrega, leitura, etc.) mas não "RECEIVED"
    const statusToIgnore = message.status && ['SENT', 'DELIVERED', 'READ'].includes(message.status);
    const bodyStatusToIgnore = req.body.status && ['SENT', 'DELIVERED', 'READ'].includes(req.body.status);
    
    if (statusToIgnore || bodyStatusToIgnore || message.ack) {
      console.log(`📊 Ignorando webhook de status: ${message.status || req.body.status || 'ACK'}`);
      res.status(200).send("Status de mensagem ignorado");
      return;
    }

    if (!from) {
      console.log("❌ ERRO: Número do remetente não encontrado na mensagem");
      console.log("Campos tentados: phone, from, remoteJid, sender, chatId");
      res.status(400).send("Número do remetente não encontrado");
      return;
    }
    if (!text.trim()) {
      console.log("⚠️ Mensagem vazia ignorada");
      res.status(200).send("Mensagem vazia ignorada");
      return;
    }

    // Buscar ou criar cliente
    const client = await getOrCreateClient(from);
    if (!client) return;

    // SALVAR MENSAGEM RECEBIDA NA TABELA CHAT_MESSAGES
    console.log('Salvando mensagem recebida via WhatsApp...');
    try {
      const { error: messageError } = await supabase.from("chat_messages").insert([
        {
          client_id: client.id,
          role: "user",
          content: text,
        },
      ]);

      if (messageError) {
        console.error("Erro ao salvar mensagem recebida:", messageError);
      } else {
        console.log('Mensagem recebida salva com sucesso');
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem recebida:', error);
    }

    // Verificar se a IA está ativa para este cliente
    if (!client.ai_enabled) {
      console.log(`IA desativada para cliente ${client.id}. Mensagem ignorada.`);
      res.status(200).send("IA desativada para este cliente");
      return;
    }

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
    
    const message = "Olá! Qual seu nome?";
    await sendWhatsappMessage(from, message);
    await saveAssistantMessage(clientId, message);
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
      const message = `Prazer, ${text}! Qual sua idade?`;
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.age) {
      context.age = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual seu objetivo principal? (ex: emagrecer, ganhar massa, etc)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.goal) {
      context.goal = text;
      await updateConversationContext(conversation?.id, context);
      const message1 = "Perfeito! Agora preciso de mais algumas informações:";
      const message2 = "Qual seu gênero? (masculino/feminino)";
      await sendWhatsappMessage(from, message1);
      await sendWhatsappMessage(from, message2);
      await saveAssistantMessage(conversation.client_id, message1);
      await saveAssistantMessage(conversation.client_id, message2);
    } else if (!context.gender) {
      context.gender = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual sua altura em cm? (ex: 175)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.height) {
      context.height = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual seu peso atual em kg? (ex: 70)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.weight) {
      context.weight = text;
      await updateConversationContext(conversation?.id, context);
      
      // TODAS AS INFORMAÇÕES COLETADAS - SALVAR NA TABELA CLIENTS
      console.log('Salvando dados do cliente na tabela clients...');
      
      try {
        // Atualizar dados do cliente na tabela clients
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update({
            name: context.name,
            age: parseInt(context.age) || null,
            gender: context.gender,
            height: parseFloat(context.height) || null,
            weight: parseFloat(context.weight) || null,
            goal: context.goal,
            last_context: context,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.client_id);

        if (clientUpdateError) {
          console.error('Erro ao atualizar dados do cliente:', clientUpdateError);
        } else {
          console.log('Dados do cliente salvos com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao salvar dados do cliente:', error);
      }
      
      // Avançar para pagamento
      await supabase
        .from("conversations")
        .update({ state: STATES.WAITING_FOR_PAYMENT })
        .eq("id", conversation?.id);
        
      const message1 = `Obrigado ${context.name}! Agora você receberá o link para pagamento via Mbway.`;
      const message2 = "💳 Link de pagamento: [IMPLEMENTAR MBWAY]";
      await sendWhatsappMessage(from, message1);
      await sendWhatsappMessage(from, message2);
      await saveAssistantMessage(conversation.client_id, message1);
      await saveAssistantMessage(conversation.client_id, message2);
    } else {
      const message = "Suas informações já foram coletadas. Aguarde o processamento.";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
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

    // MUDANÇA: Salvar plano como PENDENTE para revisão em vez de enviar diretamente
    console.log('Salvando plano como pendente para revisão...');
    
    // Importar a função savePendingPlan
    const { savePendingPlan } = await import('./services/dashboardService');
    
    // Salvar como plano pendente
    const planId = await savePendingPlan(conversation.client_id, plano);
    
    console.log(`Plano salvo como pendente com ID: ${planId}`);

    // Atualizar estado da conversa para aguardar aprovação do plano
    await supabase
      .from('conversations')
      .update({ 
        state: STATES.WAITING_FOR_PAYMENT, // Manter em pagamento até o plano ser aprovado
        context: { ...context, pendingPlanId: planId }
      })
      .eq('id', conversation.id);

    // Notificar o cliente que o plano está sendo preparado
    await sendWhatsappMessage(from, '✅ Pagamento confirmado! Estamos a preparar o seu plano personalizado.');
    await sendWhatsappMessage(from, '📋 O seu plano será revisto pela nossa equipa e enviado em breve.');
    await sendWhatsappMessage(from, '⏰ Normalmente este processo demora 24-48 horas.');

  } catch (error) {
    console.log("Erro no estado PAID:", error);
    console.error('Erro ao gerar/salvar plano pendente:', error);
    await sendWhatsappMessage(from, `Erro ao processar o seu plano. Por favor contacte o suporte.`);
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
