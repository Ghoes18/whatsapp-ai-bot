import { Request, Response, RequestHandler } from "express";
import dotenv from "dotenv";
import { sendWhatsappMessage, sendButtonList, sendList, sendButtonWithImage } from "./services/zapi";
import { generateTrainingAndNutritionPlan, askQuestionToAI, detectHumanSupportRequest } from './services/openaiService';
import { generatePlanPDF } from './services/pdfService';
import { getOrCreateClient, getActiveConversation, updateConversationContext, updateClientAfterPayment, supabase, savePlanText } from './services/supabaseService';

dotenv.config();

const STATES = {
  START: "START",
  WAITING_FOR_INFO: "WAITING_FOR_INFO",
  WAITING_FOR_PAYMENT: "WAITING_FOR_PAYMENT",
  PAID: "PAID",
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

// Nova função que combina envio e salvamento
async function sendMessageAndSave(to: string, clientId: string, content: string) {
  try {
    // Enviar mensagem via WhatsApp
    await sendWhatsappMessage(to, content);
    
    // Salvar na base de dados
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
    console.error('❌ Erro ao enviar/salvar mensagem:', error);
  }
}

// Nova função que combina envio de botões e salvamento
async function sendButtonListAndSave(to: string, clientId: string, message: string, buttons: Array<{id: string, label: string}>) {
  try {
    // Enviar botões via WhatsApp
    await sendButtonList(to, message, buttons);
    
    // Salvar na base de dados
    const { error: messageError } = await supabase.from("chat_messages").insert([
      {
        client_id: clientId,
        role: "assistant",
        content: message,
      },
    ]);

    if (messageError) {
      console.error("❌ Erro ao salvar mensagem com botões:", messageError);
    }
  } catch (error) {
    console.error('❌ Erro ao enviar/salvar botões:', error);
  }
}

// Handler principal do webhook
export const handleWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {

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
      text = buttonResponse;
    } else if (listResponse) {
      text = listResponse;
    }

    // Verificar se é realmente uma mensagem de texto (ignorar status, typing, etc.)
    if (message.messageType && message.messageType !== 'textMessage') {
      res.status(200).send("Tipo de mensagem não suportado");
      return;
    }

    // Ignorar webhooks de status de mensagem (entrega, leitura, etc.) mas não "RECEIVED"
    const statusToIgnore = message.status && ['SENT', 'DELIVERED', 'READ'].includes(message.status);
    const bodyStatusToIgnore = req.body.status && ['SENT', 'DELIVERED', 'READ'].includes(req.body.status);
    
    if (statusToIgnore || bodyStatusToIgnore || message.ack) {
      res.status(200).send("Status de mensagem ignorado");
      return;
    }

    if (!from) {
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

    // 🔍 VERIFICAÇÃO DE DUPLICAÇÃO: Verificar se já processamos esta mensagem
    const messageHash = `${from}-${text}-${Date.now()}`;
    const recentMessages = new Set();
    
    // Verificar se a mesma mensagem foi processada nos últimos 5 segundos
    const { data: recentData } = await supabase
      .from("chat_messages")
      .select("content, created_at")
      .eq("client_id", client.id)
      .eq("role", "user")
      .gte("created_at", new Date(Date.now() - 5000).toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentData && recentData.some((msg: any) => msg.content === text)) {
      res.status(200).send("Mensagem duplicada ignorada");
      return;
    }

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
    await sendMessageAndSave(from, clientId, "Olá! Sou a IA da FitAI. Irei lhe atender da forma mais rápida e eficiente possível, para conseguirmos lhe dar o nosso melhor serviço.");
    const message = "Para começarmos, qual é o seu primeiro e último nome?";
    await sendMessageAndSave(from, clientId, message);
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
          await sendMessageAndSave(from, conversation.client_id, message);
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
          await sendMessageAndSave(from, conversation.client_id, message2);
          break;
          
        case BUTTON_QUESTIONS.EXERCISE_PREFERENCES:
          context.exercise_preferences = mappedValue;
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          const message3 = "Tem restrições alimentares ou alergias? (se não, responda 'nenhuma')";
          await sendMessageAndSave(from, conversation.client_id, message3);
          break;
      }
      return;
    }
    
    // Se não é uma resposta válida de botão, verificar se deveria ser
    if (currentQuestion) {
      const warningMessage = "⚠️ Por favor, use os botões fornecidos para responder. Vou repetir a pergunta:";
      await sendMessageAndSave(from, conversation.client_id, warningMessage);
      
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
      await sendMessageAndSave(from, conversation.client_id, message);
    } else if (!context.age) {
      context.age = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual seu objetivo principal? (ex: emagrecer, ganhar massa, etc)";
      await sendMessageAndSave(from, conversation.client_id, message);
    } else if (!context.goal) {
      context.goal = text;
      await updateConversationContext(conversation?.id, context);
      const message1 = "Perfeito! Agora preciso de mais algumas informações:";
      await sendMessageAndSave(from, conversation.client_id, message1);
      
      // Usar botões para gênero
      await sendGenderQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.GENDER;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.height) {
      context.height = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual seu peso atual em kg? (ex: 70)";
      await sendMessageAndSave(from, conversation.client_id, message);
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
      await sendMessageAndSave(from, conversation.client_id, message);
    } else if (!context.equipment) {
      context.equipment = text;
      await updateConversationContext(conversation?.id, context);
      const message = "Qual é a sua principal motivação para treinar? (ex: saúde, estética, competição)";
      await sendMessageAndSave(from, conversation.client_id, message);
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
      await sendMessageAndSave(from, conversation.client_id, message1);
      await sendMessageAndSave(from, conversation.client_id, message2);
    } else {
      const message = "Suas informações já foram coletadas. Aguarde o processamento.";
      await sendMessageAndSave(from, conversation.client_id, message);
    }
  } catch (error) {
    console.log("❌ Erro no estado WAITING_FOR_INFO:", error);
  }
}

// Estado de pagamento
async function handleWaitingForPayment(from: string, text: string, conversation: any) {
  // Simples detecção de confirmação de pagamento | ALERTA: APENAS PARA TESTES DEPOIS APLICAR A API DO IFTHENPAY
  if (/pag(uei|amento)|comprovativo|pago|feito|transfer/i.test(text)) {
    // Atualizar estado para PAID
    await supabase
      .from("conversations")
      .update({ 
        state: STATES.PAID,
        last_interaction: new Date().toISOString()
      })
      .eq("id", conversation?.id);
      
    await sendMessageAndSave(from, conversation.client_id, "Pagamento confirmado! Em instantes você receberá seu plano personalizado.");
    
    // Buscar a conversa atualizada para ter o estado correto
    const { data: updatedConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation.id)
      .single();
      
    await handlePaidState(from, updatedConversation || conversation); // Avança para o próximo estado
    return;
  }
  await sendMessageAndSave(from, conversation.client_id, "Para finalizar, envie o comprovativo do pagamento Mbway para este número ou clique no link: [LINK_DO_MBWAY]");
}

// Estado pago
async function handlePaidState(from: string, conversation: any) {
  try {
    const context = conversation?.context;
    
    if (!context) {
      await sendMessageAndSave(from, conversation.client_id, 'Não foi possível encontrar seus dados para gerar o plano.');
      return;
    }

    // Importar a função de verificação de condições de saúde
    const { hasHealthConditions, generateTrainingAndNutritionPlan } = await import('./services/openaiService');
    
    // Verificar se cliente tem problemas de saúde
    const hasHealthIssues = await hasHealthConditions(context);
    
    if (hasHealthIssues) {
      
      // Gerar "plano" especial para revisão manual
      const manualReviewPlan = await generateTrainingAndNutritionPlan(context);
      
      // Salvar como plano pendente para revisão manual obrigatória
      const { savePendingPlan } = await import('./services/dashboardService');
      const planId = await savePendingPlan(conversation.client_id, manualReviewPlan);

      // Atualizar estado da conversa para aguardar aprovação do plano
      await supabase
        .from('conversations')
        .update({ 
          state: STATES.WAITING_FOR_PAYMENT, // Manter em pagamento até o plano ser aprovado
          context: { ...context, pendingPlanId: planId, requiresManualReview: true }
        })
        .eq('id', conversation.id);

      // Mensagens específicas para clientes com problemas de saúde
      await sendMessageAndSave(from, conversation.client_id, '✅ Pagamento confirmado! Obrigado pela sua confiança.');
      await sendMessageAndSave(from, conversation.client_id, '🏥 Detetámos que tem condições de saúde que requerem atenção especial.');
      await sendMessageAndSave(from, conversation.client_id, '👨‍⚕️ Por questões de segurança, o seu plano será criado manualmente por um profissional qualificado.');
      await sendMessageAndSave(from, conversation.client_id, '📋 Este processo assegura que todas as suas condições de saúde são devidamente consideradas.');
      await sendMessageAndSave(from, conversation.client_id, '⏰ O seu plano personalizado estará pronto em 24-48 horas e será revisto por um especialista.');
      
    } else {
      // Fluxo normal para clientes sem problemas de saúde
      // Gerar plano com OpenAI
      const plano = await generateTrainingAndNutritionPlan(context);

      // Salvar plano como PENDENTE para revisão em vez de enviar diretamente
      // Importar a função savePendingPlan
      const { savePendingPlan } = await import('./services/dashboardService');
      
      // Salvar como plano pendente
      const planId = await savePendingPlan(conversation.client_id, plano);

    // Atualizar estado da conversa para aguardar aprovação do plano
    await supabase
      .from('conversations')
      .update({ 
        state: STATES.WAITING_FOR_PAYMENT, // Manter em pagamento até o plano ser aprovado
        context: { ...context, pendingPlanId: planId }
      })
      .eq('id', conversation.id);

      // Notificar o cliente que o plano está sendo preparado (mensagens padrão)
    await sendMessageAndSave(from, conversation.client_id, '✅ Pagamento confirmado! Estamos a preparar o seu plano personalizado.');
    await sendMessageAndSave(from, conversation.client_id, '📋 O seu plano será revisto pela nossa equipa e enviado em breve.');
    await sendMessageAndSave(from, conversation.client_id, '⏰ Normalmente este processo demora 24-48 horas.');
    }

  } catch (error) {
    console.log("❌ Erro no estado PAID:", error);
    console.error('❌ Erro ao gerar/salvar plano pendente:', error);
    await sendMessageAndSave(from, conversation.client_id, `Erro ao processar o seu plano. Por favor contacte o suporte.`);
  }
}

// Adicionar handler para o estado QUESTIONS
async function handleQuestionsState(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    if (!text.trim()) {
      await sendMessageAndSave(from, conversation.client_id, 'Por favor, envie sua dúvida sobre o plano.');
      return;
    }

    // 🤖➡️👨 DETECTAR SOLICITAÇÃO DE ATENDIMENTO HUMANO
    if (await detectHumanSupportRequest(text)) {
      console.log('🚨 Cliente solicitou atendimento humano:', from);
      
      // Desativar IA para este cliente
      const { error: disableAIError } = await supabase
        .from('clients')
        .update({ ai_enabled: false })
        .eq('id', conversation.client_id);
      
      if (disableAIError) {
        console.error('❌ Erro ao desativar IA:', disableAIError);
      }

      // Criar solicitação de suporte humano
      const { error: supportRequestError } = await supabase
        .from('human_support_requests')
        .insert([{
          client_id: conversation.client_id,
          original_message: text,
          status: 'pending'
        }]);

      if (supportRequestError) {
        console.error('❌ Erro ao criar solicitação de suporte:', supportRequestError);
      }

      // Informar ao cliente
      await sendMessageAndSave(from, conversation.client_id, 
        '👨‍💼 Entendido! Você será atendido por um membro da nossa equipa em breve.\n\n' +
        '⏰ Tempo estimado de resposta: 1-2 horas durante horário comercial.\n\n' +
        '✅ A nossa IA foi desativada e um humano irá responder às suas próximas mensagens.'
      );
      
      console.log('✅ Solicitação de suporte humano criada');
      return;
    }

    const resposta = await askQuestionToAI(conversation.client_id, context, text);
    await sendMessageAndSave(from, conversation.client_id, resposta);
  } catch (error) {
    console.error('❌ Erro ao responder dúvida:', error);
    await sendMessageAndSave(from, conversation.client_id, 'Ocorreu um erro ao responder sua dúvida. Tente novamente mais tarde.');
  }
}

// Funções auxiliares para botões (versão elegante)
async function sendGenderQuestion(from: string, clientId: string) {
  const message = "Qual seu gênero?";
  const buttons = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" }
  ];
  
  await sendButtonListAndSave(from, clientId, message, buttons);
}

async function sendExperienceQuestion(from: string, clientId: string) {
  const message = "Qual sua experiência com exercícios?";
  const buttons = [
    { id: "iniciante", label: "Iniciante" },
    { id: "intermediario", label: "Intermediário" },
    { id: "avancado", label: "Avançado" }
  ];
  
  await sendButtonListAndSave(from, clientId, message, buttons);
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
  
  await sendButtonListAndSave(from, clientId, message, buttons);
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
  
  await sendButtonListAndSave(from, clientId, message, buttons);
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

// Nova função para transicionar conversa para estado QUESTIONS (chamada quando plano é aprovado)
export async function transitionToQuestionsState(clientId: string, approvedPlanContent: string) {
  try {
    console.log(`🔄 Transicionando cliente ${clientId} para estado QUESTIONS`);
    
    // Atualizar estado da conversa para QUESTIONS
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        state: STATES.QUESTIONS,
        last_interaction: new Date().toISOString()
      })
      .eq('client_id', clientId);

    if (updateError) {
      console.error('❌ Erro ao atualizar estado da conversa:', updateError);
      return false;
    }

    console.log(`✅ Cliente ${clientId} transicionado para estado QUESTIONS`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao transicionar para estado QUESTIONS:', error);
    return false;
  }
}
