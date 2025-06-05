import OpenAI from "openai";
import dotenv from "dotenv";
import { getChatHistory, saveChatMessage } from './chatHistoryService';
import { getPlanText } from './supabaseService';
dotenv.config();

export interface ClientContext {
  name?: string;
  age?: string;
  goal?: string;
  gender?: string;
  height?: string;
  weight?: string;
  [key: string]: any;
}

// Estrutura de mensagem para manter histórico (para usar com Supabase ou qualquer BD)
type Message = { role: "system" | "user" | "assistant"; content: string };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTrainingPlan(
  context: ClientContext
): Promise<string> {
  const systemPrompt = `
És um coach PhD em treino e nutrição, altamente qualificado e profissional. O teu papel é criar planos detalhados e personalizados de treino e dieta, adaptados às características e objetivos do cliente. Sê motivacional, claro e organizado na resposta, usando sempre o Português de Portugal.
`;

  const userPrompt = `
Cria um plano de treino personalizado e detalhado para o seguinte perfil:

Nome: ${context.name}
Idade: ${context.age} anos
Género: ${context.gender}
Altura: ${context.height} cm
Peso: ${context.weight} kg
Objetivo: ${context.goal}

O plano deve incluir:

- Sugestões específicas de exercícios (tipo, séries, repetições ou duração)
- Frequência semanal recomendada (dias e duração das sessões)
- Dicas práticas de alimentação e nutrição adaptadas ao objetivo
- Recomendações de descanso e recuperação
- Avisos ou precauções importantes (se aplicável)

Segue sempre esta estrutura para criar o plano, de forma a que todos pareçam feitos pela mesma pessoa, com títulos claros e sem usar qualquer tipo de numeração:

---

Plano Personalizado de Treino e Nutrição

Dados do Cliente  
Nome: [preencher]  
Idade: [preencher]  
Género: [preencher]  
Altura: [preencher]  
Peso: [preencher]  
Objetivo: [preencher]  

Plano de Treino  
Resumo semanal: [explica quantos dias por semana e duração média das sessões]  
Exercícios por dia:  
[Para cada dia de treino, indica os exercícios, o número de séries e repetições. Usa títulos de dias, por exemplo: "Segunda-feira", "Terça-feira", etc., e descreve os exercícios logo a seguir, em lista.]  
Observações e dicas técnicas: [dicas para execução, progressão ou adaptações]  

Plano de Nutrição  
Recomendações gerais: [aconselha o cliente conforme o objetivo]  
Sugestão de refeições ou dicas alimentares: [dá exemplos ou recomendações práticas]  
Restrições a considerar: [se houver restrições, alergias ou preferências, indicar]  

Descanso e Recuperação  
[Recomendações de descanso, sono e estratégias para uma boa recuperação]  

Avisos Importantes e Precauções  
[Indica alertas de saúde, cuidados específicos, ou quando deve procurar acompanhamento profissional]  

Mensagem de Motivação  
[Inclui uma mensagem motivacional, inspiradora e positiva para o cliente]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
    });

    return completion.choices[0].message?.content || "Plano não gerado.";
  } catch (error) {
    return "Ocorreu um erro ao gerar o plano de treino.";
  }
}

export async function askQuestionToAI(
  clientId: string,
  context: ClientContext,
  question: string
): Promise<string> {
  // Recupera histórico da conversa deste cliente
  const history = await getChatHistory(clientId);

  // Recupera o texto do plano salvo
  const planoTexto = await getPlanText(clientId);

  const systemMessage: Message = {
    role: "system",
    content:
      "És um coach PhD em treino e nutrição. Responde sempre em Português de Portugal, de forma clara, profissional e personalizada.",
  };

  const userProfile = `
Cliente:
Nome: ${context.name}
Idade: ${context.age}
Género: ${context.gender}
Altura: ${context.height} cm
Peso: ${context.weight} kg
Objetivo: ${context.goal}
`;

  const userMessage: Message = {
    role: "user",
    content: `
${userProfile}

Plano personalizado do cliente:
${planoTexto ? planoTexto : '[Plano não encontrado]'}

Pergunta: ${question}
`,
  };

  // Junta system + histórico + nova pergunta
  const messages: Message[] = [
    systemMessage,
    ...history, // histórico já deve estar filtrado para incluir apenas user/assistant
    userMessage,
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 600,
    });

    const answer =
      completion.choices[0].message?.content ||
      "Não foi possível gerar uma resposta.";

    // Guarda apenas a pergunta simples e resposta no histórico (sem contexto/plano)
    await saveChatMessage(clientId, { role: "user", content: question });
    await saveChatMessage(clientId, { role: "assistant", content: answer });

    return answer;
  } catch (error) {
    return "Ocorreu um erro ao obter resposta da inteligência artificial."
  }
}
