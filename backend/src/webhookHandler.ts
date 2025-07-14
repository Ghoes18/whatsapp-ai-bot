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
  REVIEWING_INFO: "REVIEWING_INFO", // Novo estado para revisão
} as const;
type State = typeof STATES[keyof typeof STATES];

// Constantes para perguntas com botões
const BUTTON_QUESTIONS = {
  GENDER: "gender",
  EXPERIENCE: "experience",
  AVAILABLE_DAYS: "available_days",
  EXERCISE_PREFERENCES: "exercise_preferences",
} as const;

// Constantes para comandos especiais
const COMMANDS = {
  BACK: ["voltar", "anterior", "corrigir", "mudar"],
  CONFIRM: ["confirmar", "sim", "correto", "ok"],
  CANCEL: ["cancelar", "não", "incorreto", "recomeçar"],
  REVIEW: ["revisar", "ver", "resumo"]
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
  previousQuestion?: string; // Para permitir voltar
  questionOrder?: string[]; // Para controlar a ordem das perguntas
  [key: string]: any;
}

// Ordem das perguntas para navegação
const QUESTION_ORDER = [
  'name', 'age', 'goal', 'gender', 'height', 'weight', 
  'experience', 'available_days', 'health_conditions', 
  'exercise_preferences', 'dietary_restrictions', 'equipment', 'motivation'
];

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

// Função para detectar comandos especiais
function detectCommand(text: string): string | null {
  const lowerText = text.toLowerCase().trim();
  
  if (COMMANDS.BACK.some(cmd => lowerText.includes(cmd))) return 'BACK';
  if (COMMANDS.CONFIRM.some(cmd => lowerText.includes(cmd))) return 'CONFIRM';
  if (COMMANDS.CANCEL.some(cmd => lowerText.includes(cmd))) return 'CANCEL';
  if (COMMANDS.REVIEW.some(cmd => lowerText.includes(cmd))) return 'REVIEW';
  
  return null;
}

// Função para obter a pergunta anterior
function getPreviousQuestion(currentQuestion: string): string | null {
  const currentIndex = QUESTION_ORDER.indexOf(currentQuestion);
  if (currentIndex > 0) {
    return QUESTION_ORDER[currentIndex - 1];
  }
  return null;
}

// Função para obter a próxima pergunta
function getNextQuestion(currentQuestion: string): string | null {
  const currentIndex = QUESTION_ORDER.indexOf(currentQuestion);
  if (currentIndex < QUESTION_ORDER.length - 1) {
    return QUESTION_ORDER[currentIndex + 1];
  }
  return null;
}

// Função para gerar resumo das informações coletadas
function generateInfoSummary(context: ClientContext): string {
  const summary = `📋 *RESUMO DAS SUAS INFORMAÇÕES:*

👤 *Nome:* ${context.name || 'Não informado'}
🎂 *Idade:* ${context.age || 'Não informado'} anos
🎯 *Objetivo:* ${context.goal || 'Não informado'}
⚥ *Gênero:* ${context.gender || 'Não informado'}
📏 *Altura:* ${context.height || 'Não informado'} cm
⚖️ *Peso:* ${context.weight || 'Não informado'} kg
💪 *Experiência:* ${context.experience || 'Não informado'}
📅 *Dias por semana:* ${context.available_days || 'Não informado'}
🏥 *Condições de saúde:* ${context.health_conditions || 'Não informado'}
🏃 *Preferências de exercício:* ${context.exercise_preferences || 'Não informado'}
🥗 *Restrições alimentares:* ${context.dietary_restrictions || 'Não informado'}
🏋️ *Equipamento disponível:* ${context.equipment || 'Não informado'}
🎯 *Motivação:* ${context.motivation || 'Não informado'}

✅ Se todas as informações estão corretas, digite *"confirmar"*
🔄 Para corrigir alguma informação, digite *"corrigir [campo]"* (ex: "corrigir idade") ou *"corrigir [campo]"*
❌ Para recomeçar, digite *"recomeçar"*`;

  return summary;
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
      case STATES.REVIEWING_INFO:
        await handleReviewingInfo(from, text, conversation);
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
          context: { questionOrder: QUESTION_ORDER },
        },
      ])
      .select()
      .single();
    if (newConvError) {
      console.log("❌ Erro ao criar conversa:", newConvError);
      return;
    }
    
    const welcomeMessage = `🤖 *Olá! Sou a IA da FitAI* 

Vou criar um plano personalizado de treino e nutrição especialmente para você!

📝 *INSTRUÇÕES IMPORTANTES:*
• Responda uma pergunta de cada vez
• Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*
• Para ver suas respostas: digite *"revisar"*
• Seja honesto nas respostas para um melhor plano

Vamos começar! 👇

*Qual é o seu primeiro e último nome?*

💡 _Exemplo: João Silva_`;

    await sendMessageAndSave(from, clientId, welcomeMessage);
  } catch (error) {
    console.log("❌ Erro no estado START:", error);
  }
}

// Coleta informações do cliente com sistema de correção melhorado
async function handleWaitingForInfo(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    
    // Detectar comandos especiais primeiro
    const command = detectCommand(text);
    
    if (command === 'BACK') {
      await handleBackCommand(from, conversation);
      return;
    }
    
    if (command === 'REVIEW') {
      const summary = generateInfoSummary(context);
      await sendMessageAndSave(from, conversation.client_id, summary);
      return;
    }
    
    if (command === 'CANCEL') {
      await handleCancelCommand(from, conversation);
      return;
    }
    
    // Verificar se é uma resposta de botão válida
    const currentQuestion = context.currentQuestion;
    if (currentQuestion && isValidButtonResponse(currentQuestion, text)) {
      // Processar resposta válida do botão
      const mappedValue = mapButtonIdToValue(currentQuestion, text);
      
      switch (currentQuestion) {
        case BUTTON_QUESTIONS.GENDER:
          context.gender = mappedValue;
          context.previousQuestion = 'gender';
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          await askHeightQuestion(from, conversation.client_id);
          break;
          
        case BUTTON_QUESTIONS.EXPERIENCE:
          context.experience = mappedValue;
          context.previousQuestion = 'experience';
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          await sendAvailableDaysQuestion(from, conversation.client_id);
          context.currentQuestion = BUTTON_QUESTIONS.AVAILABLE_DAYS;
          await updateConversationContext(conversation?.id, context);
          break;
          
        case BUTTON_QUESTIONS.AVAILABLE_DAYS:
          context.available_days = mappedValue;
          context.previousQuestion = 'available_days';
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          await askHealthConditionsQuestion(from, conversation.client_id);
          break;
          
        case BUTTON_QUESTIONS.EXERCISE_PREFERENCES:
          context.exercise_preferences = mappedValue;
          context.previousQuestion = 'exercise_preferences';
          context.currentQuestion = undefined;
          await updateConversationContext(conversation?.id, context);
          await askDietaryRestrictionsQuestion(from, conversation.client_id);
          break;
      }
      return;
    }
    
    // Se não é uma resposta válida de botão, verificar se deveria ser
    if (currentQuestion) {
      const warningMessage = `⚠️ *Por favor, use os botões fornecidos para responder.*

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*
📋 Para ver suas respostas, digite *"revisar"*

Vou repetir a pergunta:`;
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
      context.previousQuestion = 'name';
      await updateConversationContext(conversation?.id, context);
      await askAgeQuestion(from, conversation.client_id);
    } else if (!context.age) {
      // Validar idade
      const age = parseInt(text);
      if (isNaN(age) || age < 16 || age > 100) {
        const errorMessage = `❌ *Idade inválida!*

Por favor, digite uma idade válida entre 16 e 100 anos.

💡 _Exemplo: 25_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
        await sendMessageAndSave(from, conversation.client_id, errorMessage);
        return;
      }
      
      context.age = text;
      context.previousQuestion = 'age';
      await updateConversationContext(conversation?.id, context);
      await askGoalQuestion(from, conversation.client_id);
    } else if (!context.goal) {
      context.goal = text;
      context.previousQuestion = 'goal';
      await updateConversationContext(conversation?.id, context);
      
      const transitionMessage = `✅ *Perfeito, ${context.name}!*

Agora preciso de algumas informações físicas para criar seu plano personalizado:`;
      await sendMessageAndSave(from, conversation.client_id, transitionMessage);
      
      // Usar botões para gênero
      await sendGenderQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.GENDER;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.height) {
      // Validar altura
      const height = parseFloat(text);
      if (isNaN(height) || height < 120 || height > 250) {
        const errorMessage = `❌ *Altura inválida!*

Por favor, digite sua altura em centímetros (entre 120 e 250 cm).

💡 _Exemplo: 175_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
        await sendMessageAndSave(from, conversation.client_id, errorMessage);
        return;
      }
      
      context.height = text;
      context.previousQuestion = 'height';
      await updateConversationContext(conversation?.id, context);
      await askWeightQuestion(from, conversation.client_id);
    } else if (!context.weight) {
      // Validar peso
      const weight = parseFloat(text);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        const errorMessage = `❌ *Peso inválido!*

Por favor, digite seu peso em quilogramas (entre 30 e 300 kg).

💡 _Exemplo: 70_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
        await sendMessageAndSave(from, conversation.client_id, errorMessage);
        return;
      }
      
      context.weight = text;
      context.previousQuestion = 'weight';
      await updateConversationContext(conversation?.id, context);
      
      const transitionMessage = `💪 *Agora vamos falar sobre sua experiência com exercícios:*`;
      await sendMessageAndSave(from, conversation.client_id, transitionMessage);
      
      // Usar botões para experiência
      await sendExperienceQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.EXPERIENCE;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.health_conditions) {
      context.health_conditions = text;
      context.previousQuestion = 'health_conditions';
      await updateConversationContext(conversation?.id, context);
      
      const transitionMessage = `🏃 *Agora vamos definir suas preferências de exercício:*`;
      await sendMessageAndSave(from, conversation.client_id, transitionMessage);
      
      // Usar botões para preferências de exercício
      await sendExercisePreferencesQuestion(from, conversation.client_id);
      context.currentQuestion = BUTTON_QUESTIONS.EXERCISE_PREFERENCES;
      await updateConversationContext(conversation?.id, context);
    } else if (!context.dietary_restrictions) {
      context.dietary_restrictions = text;
      context.previousQuestion = 'dietary_restrictions';
      await updateConversationContext(conversation?.id, context);
      await askEquipmentQuestion(from, conversation.client_id);
    } else if (!context.equipment) {
      context.equipment = text;
      context.previousQuestion = 'equipment';
      await updateConversationContext(conversation?.id, context);
      await askMotivationQuestion(from, conversation.client_id);
    } else if (!context.motivation) {
      context.motivation = text;
      context.previousQuestion = 'motivation';
      await updateConversationContext(conversation?.id, context);
      
      // Mostrar resumo e pedir confirmação
      await transitionToReview(from, conversation);
    } else {
      const message = `✅ *Suas informações já foram coletadas!*

📋 Para ver o resumo, digite *"revisar"*
🔄 Para corrigir algo, digite *"corrigir [campo]"*`;
      await sendMessageAndSave(from, conversation.client_id, message);
    }
  } catch (error) {
    console.log("❌ Erro no estado WAITING_FOR_INFO:", error);
  }
}

// Novo handler para o estado de revisão
async function handleReviewingInfo(from: string, text: string, conversation: any) {
  try {
    const context: ClientContext = conversation?.context || {};
    const command = detectCommand(text);
    
    if (command === 'CONFIRM') {
      // Confirmar informações e prosseguir para pagamento
      await finalizeInfoCollection(from, conversation, context);
      return;
    }
    
    if (command === 'CANCEL') {
      await handleCancelCommand(from, conversation);
      return;
    }
    
    // Verificar se é um comando de correção específico
    const lowerText = text.toLowerCase().trim();
    if (lowerText.startsWith('corrigir') || lowerText.startsWith('corrigir')) {
      const field = lowerText.replace(/^(corrigir|corrigir)/, '').trim();
      await handleFieldCorrection(from, conversation, field);
      return;
    }
    
    // Se não é um comando reconhecido, mostrar ajuda
    const helpMessage = `❓ *Comando não reconhecido.*

📋 *Comandos disponíveis:*
• *"confirmar"* - Confirmar informações e prosseguir
• *"corrigir [campo]"* ou *"corrigir [campo]"* - Corrigir informação específica
• *"recomeçar"* - Recomeçar do início
• *"revisar"* - Ver resumo novamente

💡 _Exemplo: "corrigir idade", "corrigir nome" ou "corrigir peso"_`;
    
    await sendMessageAndSave(from, conversation.client_id, helpMessage);
    
    // Mostrar resumo novamente
    const summary = generateInfoSummary(context);
    await sendMessageAndSave(from, conversation.client_id, summary);
  } catch (error) {
    console.error("❌ Erro no estado REVIEWING_INFO:", error);
  }
}

// Função para lidar com comando "voltar"
async function handleBackCommand(from: string, conversation: any) {
  const context: ClientContext = conversation?.context || {};
  
  // Determinar qual é a pergunta atual baseada no que já foi preenchido
  let currentQuestionField = getCurrentQuestionField(context);
  
  console.log(`🔄 Voltando para: ${currentQuestionField}`);
  
  if (!currentQuestionField) {
    const message = `❌ *Não há pergunta anterior para voltar.*

Você está no início do questionário.`;
    await sendMessageAndSave(from, conversation.client_id, message);
    return;
  }
  
  // Limpar a resposta da pergunta atual
  delete context[currentQuestionField];
  
  // Limpar currentQuestion se for uma pergunta com botões
  if (context.currentQuestion) {
    delete context.currentQuestion;
  }
  
  // Determinar a pergunta anterior
  const currentIndex = QUESTION_ORDER.indexOf(currentQuestionField);
  if (currentIndex > 0) {
    context.previousQuestion = QUESTION_ORDER[currentIndex - 1];
  } else {
    delete context.previousQuestion;
  }
  
  const backMessage = `🔄 *Voltando para corrigir...*`;
  await sendMessageAndSave(from, conversation.client_id, backMessage);
  
  // Fazer a pergunta que deve ser corrigida
  await askQuestion(from, conversation.client_id, currentQuestionField, context);
  
  // Atualizar contexto após definir currentQuestion (se aplicável)
  await updateConversationContext(conversation?.id, context);
}

// Função para lidar com comando "recomeçar"
async function handleCancelCommand(from: string, conversation: any) {
  const confirmMessage = `🔄 *Tem certeza que deseja recomeçar?*

Todas as suas respostas serão perdidas.

✅ Digite *"sim"* para confirmar
❌ Digite *"não"* para continuar`;
  
  await sendMessageAndSave(from, conversation.client_id, confirmMessage);
  
  // Aguardar confirmação (implementar lógica de confirmação se necessário)
  // Por agora, vamos recomeçar diretamente
  await restartConversation(from, conversation);
}

// Função para recomeçar a conversa
async function restartConversation(from: string, conversation: any) {
  // Limpar contexto
  const newContext = { questionOrder: QUESTION_ORDER };
  
  await supabase
    .from("conversations")
    .update({ 
      state: STATES.WAITING_FOR_INFO,
      context: newContext 
    })
    .eq("id", conversation.id);
  
  const restartMessage = `🔄 *Conversa reiniciada!*

Vamos começar novamente:

*Qual é o seu primeiro e último nome?*

💡 _Exemplo: João Silva_`;
  
  await sendMessageAndSave(from, conversation.client_id, restartMessage);
}

// Função para fazer uma pergunta específica
async function askQuestion(from: string, clientId: string, questionType: string, context: ClientContext) {
  // Limpar currentQuestion antes de fazer nova pergunta
  context.currentQuestion = undefined;
  
  switch (questionType) {
    case 'name':
      await askNameQuestion(from, clientId);
      break;
    case 'age':
      await askAgeQuestion(from, clientId);
      break;
    case 'goal':
      await askGoalQuestion(from, clientId);
      break;
    case 'gender':
      await sendGenderQuestion(from, clientId);
      context.currentQuestion = BUTTON_QUESTIONS.GENDER;
      break;
    case 'height':
      await askHeightQuestion(from, clientId);
      break;
    case 'weight':
      await askWeightQuestion(from, clientId);
      break;
    case 'experience':
      await sendExperienceQuestion(from, clientId);
      context.currentQuestion = BUTTON_QUESTIONS.EXPERIENCE;
      break;
    case 'available_days':
      await sendAvailableDaysQuestion(from, clientId);
      context.currentQuestion = BUTTON_QUESTIONS.AVAILABLE_DAYS;
      break;
    case 'health_conditions':
      await askHealthConditionsQuestion(from, clientId);
      break;
    case 'exercise_preferences':
      await sendExercisePreferencesQuestion(from, clientId);
      context.currentQuestion = BUTTON_QUESTIONS.EXERCISE_PREFERENCES;
      break;
    case 'dietary_restrictions':
      await askDietaryRestrictionsQuestion(from, clientId);
      break;
    case 'equipment':
      await askEquipmentQuestion(from, clientId);
      break;
    case 'motivation':
      await askMotivationQuestion(from, clientId);
      break;
  }
  
  // Nota: O contexto será atualizado pela função que chama askQuestion
}

// Funções para fazer perguntas específicas com mensagens consolidadas
async function askNameQuestion(from: string, clientId: string) {
  const message = `*Qual é o seu primeiro e último nome?*

💡 _Exemplo: João Silva_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askAgeQuestion(from: string, clientId: string) {
  const message = `*Qual sua idade?*

💡 _Digite apenas o número (ex: 25)_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askGoalQuestion(from: string, clientId: string) {
  const message = `*Qual seu objetivo principal?*

💡 _Exemplos: emagrecer, ganhar massa muscular, definir o corpo, melhorar condicionamento_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askHeightQuestion(from: string, clientId: string) {
  const message = `*Qual sua altura em centímetros?*

💡 _Digite apenas o número (ex: 175)_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askWeightQuestion(from: string, clientId: string) {
  const message = `*Qual seu peso atual em quilogramas?*

💡 _Digite apenas o número (ex: 70)_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askHealthConditionsQuestion(from: string, clientId: string) {
  const message = `*Tem alguma condição de saúde ou lesão que deva considerar?*

⚠️ _Seja específico para sua segurança (ex: hipertensão, diabetes, lesão no joelho)_
✅ _Se não tem nenhuma, digite "nenhuma"_

🔄 Para voltar, digite *"voltar"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askDietaryRestrictionsQuestion(from: string, clientId: string) {
  const message = `*Tem restrições alimentares ou alergias?*

💡 _Exemplos: vegetariano, alergia a lactose, intolerância ao glúten_
✅ _Se não tem nenhuma, digite "nenhuma"_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askEquipmentQuestion(from: string, clientId: string) {
  const message = `*Que equipamento tem disponível para treinar?*

💡 _Exemplos: academia completa, halteres em casa, elásticos, apenas peso corporal_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

async function askMotivationQuestion(from: string, clientId: string) {
  const message = `*Qual é a sua principal motivação para treinar?*

💡 _Exemplos: saúde, estética, competição, bem-estar mental_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  await sendMessageAndSave(from, clientId, message);
}

// Função para transicionar para revisão
async function transitionToReview(from: string, conversation: any) {
  const context: ClientContext = conversation?.context || {};
  
  // Atualizar estado para revisão
  await supabase
    .from("conversations")
    .update({ state: STATES.REVIEWING_INFO })
    .eq("id", conversation.id);
  
  const transitionMessage = `🎉 *Excelente! Coletamos todas as informações necessárias.*

Agora vou mostrar um resumo para você confirmar:`;
  
  await sendMessageAndSave(from, conversation.client_id, transitionMessage);
  
  // Mostrar resumo
  const summary = generateInfoSummary(context);
  await sendMessageAndSave(from, conversation.client_id, summary);
}

// Função para finalizar coleta de informações
async function finalizeInfoCollection(from: string, conversation: any, context: ClientContext) {
  try {
    // Salvar dados do cliente na tabela clients
    console.log('💾 Salvando dados...');
    
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update({
            name: context.name,
        age: parseInt(context.age || '0') || null,
            gender: context.gender,
        height: parseFloat(context.height || '0') || null,
        weight: parseFloat(context.weight || '0') || null,
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
        console.log('✅ Dados salvos');
      }
      
      // Avançar para pagamento
      await supabase
        .from("conversations")
        .update({ state: STATES.WAITING_FOR_PAYMENT })
      .eq("id", conversation.id);
      
    const paymentMessage = `✅ *Informações confirmadas com sucesso!*

Obrigado, ${context.name}! Agora você receberá o link para pagamento via Mbway.

💳 *Link de pagamento:* [IMPLEMENTAR MBWAY]

📱 Após o pagamento, envie o comprovativo para continuar.`;
    
    await sendMessageAndSave(from, conversation.client_id, paymentMessage);
    
  } catch (error) {
    console.error('❌ Erro ao finalizar coleta de informações:', error);
    await sendMessageAndSave(from, conversation.client_id, 'Erro ao processar suas informações. Tente novamente.');
  }
}

// Função para corrigir campo específico
async function handleFieldCorrection(from: string, conversation: any, field: string) {
  const context: ClientContext = conversation?.context || {};
  
  // Mapear nomes de campos para chaves do contexto
  const fieldMapping: { [key: string]: string } = {
    'nome': 'name',
    'idade': 'age',
    'objetivo': 'goal',
    'gênero': 'gender',
    'genero': 'gender',
    'altura': 'height',
    'peso': 'weight',
    'experiência': 'experience',
    'experiencia': 'experience',
    'dias': 'available_days',
    'saúde': 'health_conditions',
    'saude': 'health_conditions',
    'condições': 'health_conditions',
    'condicoes': 'health_conditions',
    'exercícios': 'exercise_preferences',
    'exercicios': 'exercise_preferences',
    'preferências': 'exercise_preferences',
    'preferencias': 'exercise_preferences',
    'restrições': 'dietary_restrictions',
    'restricoes': 'dietary_restrictions',
    'alimentares': 'dietary_restrictions',
    'dieta': 'dietary_restrictions',
    'equipamento': 'equipment',
    'motivação': 'motivation',
    'motivacao': 'motivation'
  };
  
  const fieldKey = fieldMapping[field] || field;
  
  if (!QUESTION_ORDER.includes(fieldKey)) {
    const errorMessage = `❌ *Campo não reconhecido: "${field}"*

📋 *Campos disponíveis para correção:*
• nome, idade, objetivo, gênero
• altura, peso, experiência, dias
• saúde, exercícios, restrições, equipamento, motivação

💡 _Exemplo: "corrigir idade" ou "corrigir nome"_`;
    
    await sendMessageAndSave(from, conversation.client_id, errorMessage);
    return;
  }
  
  // Limpar o campo e voltar para essa pergunta
  delete context[fieldKey];
  context.previousQuestion = fieldKey;
  
  // Voltar para estado de coleta
  await supabase
    .from("conversations")
    .update({ 
      state: STATES.WAITING_FOR_INFO,
      context: context 
    })
    .eq("id", conversation.id);
  
  const correctionMessage = `🔄 *Corrigindo "${field}"...*

Vou repetir a pergunta:`;
  
  await sendMessageAndSave(from, conversation.client_id, correctionMessage);
  
  // Fazer a pergunta novamente
  await askQuestion(from, conversation.client_id, fieldKey, context);
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

// Funções auxiliares para botões (versão melhorada)
async function sendGenderQuestion(from: string, clientId: string) {
  const message = `*Qual seu gênero?*

💡 _Use os botões abaixo para responder_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  const buttons = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" }
  ];
  
  await sendButtonListAndSave(from, clientId, message, buttons);
}

async function sendExperienceQuestion(from: string, clientId: string) {
  const message = `*Qual sua experiência com exercícios?*

💡 _Use os botões abaixo para responder_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
  const buttons = [
    { id: "iniciante", label: "Iniciante" },
    { id: "intermediario", label: "Intermediário" },
    { id: "avancado", label: "Avançado" }
  ];
  
  await sendButtonListAndSave(from, clientId, message, buttons);
}

async function sendAvailableDaysQuestion(from: string, clientId: string) {
  const message = `*Quantos dias por semana pode treinar?*

💡 _Use os botões abaixo para responder_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
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
  const message = `*Que tipo de exercícios prefere?*

💡 _Use os botões abaixo para responder_

🔄 Para corrigir a última pergunta caso tenha se enganado envie a mensagem *"voltar"* ou *"corrigir"*`;
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

// Nova função para determinar qual é a pergunta atual baseada no contexto
function getCurrentQuestionField(context: ClientContext): string | null {
  // Se tem currentQuestion definida (pergunta com botões), essa é a pergunta atual
  if (context.currentQuestion) {
    switch (context.currentQuestion) {
      case BUTTON_QUESTIONS.GENDER:
        return 'gender';
      case BUTTON_QUESTIONS.EXPERIENCE:
        return 'experience';
      case BUTTON_QUESTIONS.AVAILABLE_DAYS:
        return 'available_days';
      case BUTTON_QUESTIONS.EXERCISE_PREFERENCES:
        return 'exercise_preferences';
    }
  }
  
  // Determinar baseado no que ainda não foi preenchido (próxima pergunta esperada)
  for (const field of QUESTION_ORDER) {
    if (!context[field] || context[field] === undefined) {
      return field;
    }
  }
  
  // Se tudo está preenchido, retornar o último campo (para permitir correção)
  return QUESTION_ORDER[QUESTION_ORDER.length - 1];
}
