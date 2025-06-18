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
  experience?: string;
  available_days?: string;
  health_conditions?: string;
  exercise_preferences?: string;
  dietary_restrictions?: string;
  equipment?: string;
  motivation?: string;
  [key: string]: any;
}

// Estrutura de mensagem para manter histórico (para usar com Supabase ou qualquer BD)
type Message = { role: "system" | "user" | "assistant"; content: string };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTrainingAndNutritionPlan(
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
Experiência: ${context.experience || 'Não especificada'}
Dias disponíveis: ${context.available_days || 'Não especificados'}
Condições de saúde: ${context.health_conditions || 'Nenhuma'}
Preferências de exercício: ${context.exercise_preferences || 'Não especificadas'}
Restrições alimentares: ${context.dietary_restrictions || 'Nenhuma'}
Equipamento disponível: ${context.equipment || 'Não especificado'}
Motivação: ${context.motivation || 'Não especificada'}

Se alguma informação do perfil do cliente estiver 'Não especificada', faz suposições razoáveis baseadas no objetivo geral (e.g., para 'ganho de massa muscular' e 'não especificada' em 'experiência', assume um nível iniciante a intermédio, a menos que o contexto sugira o contrário). No entanto, se a ausência de informação for crítica para a segurança ou eficácia do plano (e.g., 'condições de saúde'), indica claramente que a informação é necessária e que o plano é uma sugestão geral que requer validação profissional.

O plano deve incluir:

- Sugestões específicas de exercícios (nome completo, instruções breves de execução, variações/progressões, foco muscular, séries, repetições ou duração)
- Frequência semanal recomendada (dias e duração das sessões)
- Dicas práticas de alimentação e nutrição adaptadas ao objetivo, incluindo exemplos de refeições para diferentes momentos do dia, sugestões de macronutrientes e dicas de hidratação/suplementação (se aplicável e com ressalvas).
- Recomendações de descanso e recuperação (sono, estratégias de recuperação ativa/passiva).
- Avisos ou precauções importantes (sempre enfatizar a consulta a um profissional de saúde, declarar que o plano é uma sugestão e não substitui aconselhamento médico/nutricional).

Segue sempre esta estrutura para criar o plano, de forma a que todos pareçam feitos pela mesma pessoa, com títulos claros e sem usar qualquer tipo de numeração. É imperativo que esta estrutura seja seguida à risca, com os títulos exatos e sem qualquer tipo de numeração, para manter a uniformidade e profissionalismo de todos os planos gerados:

---

Plano Personalizado de Treino e Nutrição

Dados do Cliente  
Nome: [preencher]  
Idade: [preencher]  
Género: [preencher]  
Altura: [preencher]  
Peso: [preencher]  
Objetivo: [preencher]  
Experiência: [preencher]  
Dias disponíveis: [preencher]  
Condições de saúde: [preencher]  
Preferências de exercício: [preencher]  
Restrições alimentares: [preencher]  
Equipamento disponível: [preencher]  
Motivação: [preencher]  

Plano de Treino  
Resumo semanal: [explica quantos dias por semana e duração média das sessões]  
Exercícios por dia:  
[Para cada dia de treino, indica os exercícios, o número de séries e repetições. Usa títulos de dias, por exemplo: "Dia 1", "Dia 2", etc., e descreve os exercícios logo a seguir, em lista, incluindo nome completo, instruções breves de execução, variações/progressões, e foco muscular.]  
Observações e dicas técnicas: [dicas para execução, progressão ou adaptações]  

Plano de Nutrição  
Recomendações gerais: [aconselha o cliente conforme o objetivo, com base em evidências científicas]  
Sugestão de refeições ou dicas alimentares: [dá exemplos ou recomendações práticas para diferentes momentos do dia, incluindo sugestões de macronutrientes, hidratação e suplementação (se aplicável e com ressalvas).]  
Restrições a considerar: [se houver restrições, alergias ou preferências, indicar e como lidar com elas]  

Descanso e Recuperação  
[Recomendações de descanso, sono e estratégias para uma boa recuperação, como alongamentos, massagens, etc.]  

Avisos Importantes e Precauções  
[Indica alertas de saúde, cuidados específicos, ou quando deve procurar acompanhamento profissional. Sempre enfatiza a importância de consultar um profissional de saúde ou médico antes de iniciar qualquer novo regime de treino ou dieta, especialmente se houver condições de saúde preexistentes. Declara que o plano fornecido é uma sugestão e não substitui o aconselhamento médico ou nutricional personalizado.]  

Mensagem de Motivação  
[Inclui uma mensagem motivacional, inspiradora e positiva para o cliente, diretamente relacionada com o seu objetivo e reconhecendo os desafios mas focando no progresso e na consistência.]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
Experiência: ${context.experience || 'Não especificada'}
Dias disponíveis: ${context.available_days || 'Não especificados'}
Condições de saúde: ${context.health_conditions || 'Nenhuma'}
Preferências de exercício: ${context.exercise_preferences || 'Não especificadas'}
Restrições alimentares: ${context.dietary_restrictions || 'Nenhuma'}
Equipamento disponível: ${context.equipment || 'Não especificado'}
Motivação: ${context.motivation || 'Não especificada'}
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

    return answer;
  } catch (error) {
    return "Ocorreu um erro ao obter resposta da inteligência artificial."
  }
}
