import { Request, Response, RequestHandler } from "express";
import dotenv from "dotenv";
import { sendWhatsappMessage, sendButtonList, sendList, sendButtonWithImage } from "./services/zapi";
import { generateTrainingAndNutritionPlan, askQuestionToAI } from './services/openaiService';
import { generatePlanPDF } from './services/pdfService';
import { getOrCreateClient, getActiveConversation, updateConversationContext, updateClientAfterPayment, supabase, savePlanText } from './services/supabaseService';

dotenv.config();

const STATES = {
  START: "START",
  WAITING_FOR_INFO: "WAITING_FOR_INFO",
  WAITING_FOR_PAYMENT: "WAITING_FOR_PAYMENT",
  PAID: "PAID",
  SENT_PLAN: "SENT_PLAN",
  QUESTIONS: "QUESTIONS",
} as const;
type State = typeof STATES[keyof typeof STATES];

// Constantes para perguntas com botões
const BUTTON_QUESTIONS = {
  GENDER: "gender",
  EXPERIENCE: "experience",
  AVAILABLE_DAYS: "available_days",
  EXERCISE_PREFERENCES: "exercise_preferences",
} as const;

interface ClientContext {
  name?: string;
  age?: string;
  goal?: string;
  gender?: string;
  height?: string;
  weight?: string;
  experience?: string;
  available_days?: string;
  health_conditions?: string;
  exercise_preferences?: string;
  dietary_restrictions?: string;
  equipment?: string;
  motivation?: string;
  currentQuestion?: string;
  [key: string]: any;
}

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
      console.error("❌ Erro ao salvar mensagem do assistente:", messageError);
    }
  } catch (error) {
    console.error('❌ Erro ao salvar mensagem do assistente:', error);
  }
}

// Handler principal do webhook
export const handleWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("=== WEBHOOK RECEBIDO ===");

    // Tentar diferentes estruturas de mensagem que o ZAPI pode enviar
    let message = req.body.message;
    
    // Se não encontrou 'message', tentar outras estruturas possíveis
    if (!message) {
      // Verificar se é uma estrutura direta
      if (req.body.phone || req.body.from || req.body.remoteJid) {
        message = req.body;
      }
      // Verificar outras possíveis estruturas
      else if (req.body.data?.message) {
        message = req.body.data.message;
      }
      else if (req.body.webhook?.message) {
        message = req.body.webhook.message;
      }
      else {
        console.log("❌ Estrutura de mensagem não reconhecida");
        res.status(400).send("Estrutura de mensagem inválida");
        return;
      }
    }

    // Extrair dados principais com mais flexibilidade
    const from: string | undefined = 
      message.phone || 
      message.from || 
      message.remoteJid || 
      message.sender ||
      message.chatId;
      
    let text: string = 
      message.text?.message || 
      message.body || 
      message.content ||
      message.text ||
      message.message ||
      '';
    
    // Verificar se é uma resposta de botão
    const buttonResponse = 
      message.buttonsResponseMessage?.buttonId ||
      message.buttonResponse ||
      message.button?.response ||
      message.response?.button ||
      message.data?.buttonResponse ||
      message.webhook?.buttonResponse;

    // Verificar se é uma resposta de lista
    const listResponse = 
      message.listResponseMessage?.rowId ||
      message.listResponse?.rowId ||
      message.response?.list?.rowId ||
      message.data?.listResponse?.rowId ||
      message.webhook?.listResponse?.rowId;

    if (buttonResponse) {
      console.log("🎯 Botão clicado:", buttonResponse);
      text = buttonResponse;
    } else if (listResponse) {
      console.log("📋 Lista selecionada:", listResponse);
      text = listResponse;
    }

    // Log adicional para debug de respostas
    if (message.buttonsResponseMessage || message.listResponseMessage) {
      console.log("🔍 Estrutura da resposta:", JSON.stringify({
        buttonsResponse: message.buttonsResponseMessage,
        listResponse: message.listResponseMessage
      }, null, 2));
    }

    console.log("📱 De:", from, "| Texto:", text);

    // Verificar se é realmente uma mensagem de texto (ignorar status, typing, etc.)
    if (message.messageType && message.messageType !== 'textMessage') {
      console.log(`📄 Ignorando tipo: ${message.messageType}`);
      res.status(200).send("Tipo de mensagem não suportado");
      return;
    }

    // Ignorar webhooks de status de mensagem (entrega, leitura, etc.) mas não "RECEIVED"
    const statusToIgnore = message.status && ['SENT', 'DELIVERED', 'READ'].includes(message.status);
    const bodyStatusToIgnore = req.body.status && ['SENT', 'DELIVERED', 'READ'].includes(req.body.status);
    
    if (statusToIgnore || bodyStatusToIgnore || message.ack) {
      console.log(`📊 Status ignorado: ${message.status || req.body.status || 'ACK'}`);
      res.status(200).send("Status de mensagem ignorado");
      return;
    }

    if (!from) {
      console.log("❌ Número do remetente não encontrado");
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
    try {
      const { error: messageError } = await supabase.from("chat_messages").insert([
        {
          client_id: client.id,
          role: "user",
          content: text,
        },
      ]);
      if (messageError) console.error("❌ Erro ao salvar mensagem recebida:", messageError);
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem recebida:', error);
    }

    if (!client.ai_enabled) {
      res.status(200).send("IA desativada para este cliente");
      return;
    }

    const conversation = await getActiveConversation(client.id);
    let userState: State = conversation?.state || STATES.START;

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
      console.log("❌ Erro ao criar conversa:", newConvError);
      return;
    }
    console.log("🚀 Iniciando conversa com cliente:", from);
    await sendWhatsappMessage(from, "Olá! Sou a IA da FitAI. Irei lhe atender da forma mais rápida e eficiente possível, para conseguirmos lhe dar o nosso melhor serviço.");
    const message = "Para começarmos, qual é o seu primeiro e último nome?";
    await sendWhatsappMessage(from, message);
    await saveAssistantMessage(clientId, message);
  } catch (error) {
    console.log("❌ Erro no estado START:", error);
  }
}

// Coleta informações do cliente
async function handleWaitingForInfo(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    
    // Verificar se é uma resposta de botão válida
    const currentQuestion = context.currentQuestion;
    if (currentQuestion && isValidButtonResponse(currentQuestion, text)) {
      // Processar resposta válida do botão
      const mappedValue = mapButtonIdToValue(currentQuestion, text);
      
      switch (currentQuestion) {
        case BUTTON_QUESTIONS.GENDER:
          context.gender = mappedValue;
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          const message = "Qual sua altura em cm? (ex: 175)";
          await sendWhatsappMessage(from, message);
          await saveAssistantMessage(conversation.client_id, message);
          break;
          
        case BUTTON_QUESTIONS.EXPERIENCE:
          context.experience = mappedValue;
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          await sendAvailableDaysQuestion(from, conversation.client_id);
          context.currentQuestion = BUTTON_QUESTIONS.AVAILABLE_DAYS;
          await updateConversationContext(conversation?.id, context);
          break;
          
        case BUTTON_QUESTIONS.AVAILABLE_DAYS:
          context.available_days = mappedValue;
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          const message2 = "Tem alguma condição de saúde ou lesão que deva considerar? (se não, responda 'nenhuma')";
          await sendWhatsappMessage(from, message2);
          await saveAssistantMessage(conversation.client_id, message2);
          break;
          
        case BUTTON_QUESTIONS.EXERCISE_PREFERENCES:
          context.exercise_preferences = mappedValue;
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          const message3 = "Tem restrições alimentares ou alergias? (se não, responda 'nenhuma')";
          await sendWhatsappMessage(from, message3);
          await saveAssistantMessage(conversation.client_id, message3);
          break;
      }
      return;
    }
    
    // Se não é uma resposta válida de botão, verificar se deveria ser
    if (currentQuestion) {
      const warningMessage = "⚠️ Por favor, use os botões fornecidos para responder. Vou repetir a pergunta:";
      await sendWhatsappMessage(from, warningMessage);
      await saveAssistantMessage(conversation.client_id, warningMessage);
      
      // Repetir a pergunta com botões
      switch (currentQuestion) {
        case BUTTON_QUESTIONS.GENDER:
          await sendGenderQuestion(from, conversation.client_id);
          break;
        case BUTTON_QUESTIONS.EXPERIENCE:
          await sendExperienceQuestion(from, conversation.client_id);
          break;
        case BUTTON_QUESTIONS.AVAILABLE_DAYS:
          await sendAvailableDaysQuestion(from, conversation.client_id);
          break;
        case BUTTON_QUESTIONS.EXERCISE_PREFERENCES:
          await sendExercisePreferencesQuestion(from, conversation.client_id);
          break;
      }
      return;
    }
    
    // Fluxo normal para perguntas de texto livre
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
      await sendWhatsappMessage(from, message1);
      await saveAssistantMessage(conversation.client_id, message1);
      
      // Usar botões para gênero
      await sendGenderQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.GENDER;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.height) {
      context.height = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual seu peso atual em kg? (ex: 70)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.weight) {
      context.weight = text;
      await updateConversationContext(conversation?.id, context);
      
      // Usar botões para experiência
      await sendExperienceQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.EXPERIENCE;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.health_conditions) {
      context.health_conditions = text;
      await updateConversationContext(conversation?.id, context);
      
      // Usar botões para preferências de exercício
      await sendExercisePreferencesQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.EXERCISE_PREFERENCES;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.dietary_restrictions) {
      context.dietary_restrictions = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Que equipamento tem disponível? (ex: halteres, elásticos, apenas peso corporal)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.equipment) {
      context.equipment = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual é a sua principal motivação para treinar? (ex: saúde, estética, competição)";
      await sendWhatsappMessage(from, message);
      await saveAssistantMessage(conversation.client_id, message);
    } else if (!context.motivation) {
      context.motivation = text;
      await updateConversationContext(conversation?.id, context);
      
      // TODAS AS INFORMAÇÕES COLETADAS - SALVAR NA TABELA CLIENTS
      console.log('💾 Salvando dados do cliente...');
      
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
            experience: context.experience,
            available_days: context.available_days,
            health_conditions: context.health_conditions,
            exercise_preferences: context.exercise_preferences,
            dietary_restrictions: context.dietary_restrictions,
            equipment: context.equipment,
            motivation: context.motivation,
            last_context: context,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.client_id);

        if (clientUpdateError) {
          console.error('❌ Erro ao atualizar dados do cliente:', clientUpdateError);
        } else {
          console.log('✅ Dados do cliente salvos');
        }
      } catch (error) {
        console.error('❌ Erro ao salvar dados do cliente:', error);
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
    console.log("❌ Erro no estado WAITING_FOR_INFO:", error);
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
    const plano = await generateTrainingAndNutritionPlan(context);

    // MUDANÇA: Salvar plano como PENDENTE para revisão em vez de enviar diretamente
    console.log('📋 Salvando plano como pendente...');
    
    // Importar a função savePendingPlan
    const { savePendingPlan } = await import('./services/dashboardService');
    
    // Salvar como plano pendente
    const planId = await savePendingPlan(conversation.client_id, plano);
    
    console.log(`✅ Plano pendente salvo (ID: ${planId})`);

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
    await saveAssistantMessage(conversation.client_id, '✅ Pagamento confirmado! Estamos a preparar o seu plano personalizado.');
    await sendWhatsappMessage(from, '📋 O seu plano será revisto pela nossa equipa e enviado em breve.');
    await saveAssistantMessage(conversation.client_id, '📋 O seu plano será revisto pela nossa equipa e enviado em breve.');
    await sendWhatsappMessage(from, '⏰ Normalmente este processo demora 24-48 horas.');
    await saveAssistantMessage(conversation.client_id, '⏰ Normalmente este processo demora 24-48 horas.');

  } catch (error) {
    console.log("❌ Erro no estado PAID:", error);
    console.error('❌ Erro ao gerar/salvar plano pendente:', error);
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
    console.error('❌ Erro ao responder dúvida:', error);
    await sendWhatsappMessage(from, 'Ocorreu um erro ao responder sua dúvida. Tente novamente mais tarde.');
  }
}

// Funções auxiliares para botões (versão elegante)
async function sendGenderQuestion(from: string, clientId: string) {
  const message = "Qual seu gênero?";
  const buttons = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" }
  ];
  
  await sendButtonList(from, message, buttons);
  await saveAssistantMessage(clientId, message);
}

async function sendExperienceQuestion(from: string, clientId: string) {
  const message = "Qual sua experiência com exercícios?";
  const buttons = [
    { id: "iniciante", label: "Iniciante" },
    { id: "intermediario", label: "Intermediário" },
    { id: "avancado", label: "Avançado" }
  ];
  
  await sendButtonList(from, message, buttons);
  await saveAssistantMessage(clientId, message);
}

async function sendAvailableDaysQuestion(from: string, clientId: string) {
  const message = "Quantos dias por semana pode treinar?";
  const buttons = [
    { id: "2_dias", label: "2 dias" },
    { id: "3_dias", label: "3 dias" },
    { id: "4_dias", label: "4 dias" },
    { id: "5_dias", label: "5 dias" },
    { id: "6_dias", label: "6 dias" }
  ];
  
  await sendButtonList(from, message, buttons);
  await saveAssistantMessage(clientId, message);
}

async function sendExercisePreferencesQuestion(from: string, clientId: string) {
  const message = "Que tipo de exercícios prefere?";
  const buttons = [
    { id: "musculacao", label: "Musculação" },
    { id: "cardio", label: "Cardio" },
    { id: "yoga", label: "Yoga" },
    { id: "funcional", label: "Funcional" },
    { id: "misturado", label: "Misturado" }
  ];
  
  await sendButtonList(from, message, buttons);
  await saveAssistantMessage(clientId, message);
}

// Função para verificar se a resposta é válida para perguntas com botões
function isValidButtonResponse(questionType: string, response: string): boolean {
  const validResponses: { [key: string]: string[] } = {
    [BUTTON_QUESTIONS.GENDER]: ["masculino", "feminino"],
    [BUTTON_QUESTIONS.EXPERIENCE]: ["iniciante", "intermediario", "avancado"],
    [BUTTON_QUESTIONS.AVAILABLE_DAYS]: ["2_dias", "3_dias", "4_dias", "5_dias", "6_dias"],
    [BUTTON_QUESTIONS.EXERCISE_PREFERENCES]: ["musculacao", "cardio", "yoga", "funcional", "misturado"]
  };
  
  return validResponses[questionType]?.includes(response.toLowerCase()) || false;
}

// Função para mapear IDs dos botões para valores legíveis
function mapButtonIdToValue(questionType: string, buttonId: string): string {
  const mappings: { [key: string]: { [key: string]: string } } = {
    [BUTTON_QUESTIONS.GENDER]: {
      "masculino": "masculino",
      "feminino": "feminino"
    },
    [BUTTON_QUESTIONS.EXPERIENCE]: {
      "iniciante": "iniciante",
      "intermediario": "intermediário",
      "avancado": "avançado"
    },
    [BUTTON_QUESTIONS.AVAILABLE_DAYS]: {
      "2_dias": "2 dias",
      "3_dias": "3 dias",
      "4_dias": "4 dias",
      "5_dias": "5 dias",
      "6_dias": "6 dias"
    },
    [BUTTON_QUESTIONS.EXERCISE_PREFERENCES]: {
      "musculacao": "musculação",
      "cardio": "cardio",
      "yoga": "yoga",
      "funcional": "funcional",
      "misturado": "misturado"
    }
  };
  
  return mappings[questionType]?.[buttonId] || buttonId;
}
