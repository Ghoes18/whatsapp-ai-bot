import OpenAI from "openai";
import dotenv from "dotenv";
import { getChatHistory, saveChatMessage } from "./chatHistoryService";
import {
  getAdminChatHistory,
  saveAdminChatMessage,
  getAdminConversation,
} from "./adminChatHistoryService";
import { getPlanText, supabase } from "./supabaseService";
import {
  getDashboardStats,
  getRecentActivity,
  getPendingPlans,
  type RecentActivity,
  type PendingPlan,
} from "./dashboardService";
import { readFile } from "fs/promises";
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

// Função para verificar se cliente tem problemas de saúde usando IA
export async function hasHealthConditions(context: ClientContext): Promise<boolean> {
  if (!context.health_conditions) {
    return false;
  }
  
  const healthConditions = context.health_conditions.toLowerCase().trim();
  
  // Se a resposta for claramente "nenhuma condição", retornar false imediatamente
  const clearNoConditions = [
    "nenhuma",
    "nenhum", 
    "não",
    "nao",
    "sem problemas",
    "sem condicoes",
    "sem condições",
    "saudável",
    "saudavel",
    "normal",
    "ok",
    "tudo bem",
    "tudo ok",
    "não tenho",
    "nao tenho",
    "não há",
    "nao ha",
    "sem nada",
    "nada",
    "n/a",
    "zero",
    "0",
    ""
  ];
  
  // Verificar se é claramente "nenhuma condição"
  const isClearlyNoCondition = clearNoConditions.some(indicator => {
    if (indicator === "") return healthConditions === "";
    const regex = new RegExp(`\\b${indicator}\\b`, 'i');
    return regex.test(healthConditions) || healthConditions === indicator;
  });
  
  if (isClearlyNoCondition) {
    return false;
  }
  
  // Usar IA para interpretar se há problemas de saúde
  
  try {
    const systemPrompt = `
És um especialista médico em análise de condições de saúde para fitness. A tua tarefa é determinar se uma pessoa tem condições de saúde que requerem atenção especial antes de criar um plano de treino.

Responde APENAS com um objeto JSON no seguinte formato, sem qualquer texto adicional:
{
  "has_health_conditions": true/false,
  "reason": "breve explicação da decisão em Português de Portugal"
}

Exemplos:
- Input: "Nenhuma" → { "has_health_conditions": false, "reason": "Nenhuma condição reportada" }
- Input: "Dor nas costas" → { "has_health_conditions": true, "reason": "Problema ortopédico que requer precauções" }
- Input: "Diabetes tipo 2" → { "has_health_conditions": true, "reason": "Doença crónica que afeta o exercício" }
- Input: "Estou bem" → { "has_health_conditions": false, "reason": "Sem indicação de problemas" }

Regras:
- SIM (true): Qualquer menção a doenças, lesões, condições que afetem exercício ou medicação.
- NÃO (false): Respostas que indiquem ausência de problemas.
- Em dúvida: Escolhe true para segurança.

Responde sempre em formato JSON válido.
`;

    const userPrompt = `Analisa esta resposta sobre condições de saúde: "${healthConditions}"

Esta pessoa tem condições de saúde que requerem atenção especial para criar um plano de treino?`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message?.content?.trim();
    
    let result = false;
    try {
      const jsonResponse = JSON.parse(responseContent || '{}');
      result = jsonResponse.has_health_conditions === true;
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
      // Fallback: se não conseguir fazer parse, assumir que tem problemas
      result = true;
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao usar IA para interpretar condições de saúde:', error);
    
    // Fallback: se a IA falhar, usar lógica conservadora
    return healthConditions.length > 0; // Se escreveu algo, assumir que pode ter problemas
  }
}

export async function generateTrainingAndNutritionPlan(
  context: ClientContext
): Promise<string> {
  // NOVA REGRA: Se cliente tem problemas de saúde, não gerar plano por IA
  const hasHealthIssues = await hasHealthConditions(context);
  
  if (hasHealthIssues) {
    
    // Retornar mensagem especial indicando que requer revisão manual
    const manualReviewMessage = `⚠️ PLANO REQUER REVISÃO MANUAL ⚠️

MOTIVO: Cliente reportou condições de saúde que requerem avaliação profissional.

DADOS DO CLIENTE:
Nome: ${context.name}
Idade: ${context.age} anos
Género: ${context.gender}
Altura: ${context.height} cm
Peso: ${context.weight} kg
Objetivo: ${context.goal}
Experiência: ${context.experience || "Não especificada"}
Dias disponíveis: ${context.available_days || "Não especificados"}
⚠️ CONDIÇÕES DE SAÚDE: ${context.health_conditions}
Preferências de exercício: ${context.exercise_preferences || "Não especificadas"}
Restrições alimentares: ${context.dietary_restrictions || "Nenhuma"}
Equipamento disponível: ${context.equipment || "Não especificado"}
Motivação: ${context.motivation || "Não especificada"}

🔍 AÇÃO REQUERIDA:
- Avaliar as condições de saúde reportadas
- Consultar profissional de saúde se necessário
- Criar plano personalizado considerando as limitações médicas
- Incluir avisos específicos e precauções apropriadas

⚠️ IMPORTANTE: Este plano deve ser criado manualmente por um profissional qualificado devido às condições de saúde reportadas pelo cliente.`;
    
    return manualReviewMessage;
  }

  const systemPrompt = `
És um coach PhD em treino e nutrição, altamente qualificado e profissional. Cria planos detalhados e personalizados de treino e dieta, adaptados às características e objetivos do cliente. Sê motivacional, claro e organizado na resposta, usando sempre o Português de Portugal. Prioriza a segurança, especialmente com condições de saúde, e inclui avisos apropriados. Baseia as recomendações em evidências científicas, inclui progressões semanais e dicas para rastrear progresso.
`;

  // Improved user prompt: Added more structure, required sections for progress tracking, sample meal plans with calorie estimates, and warm-up/cool-down routines.
  const userPrompt = `
Cria um plano de treino personalizado e detalhado para o seguinte perfil:

Nome: ${context.name}
Idade: ${context.age} anos
Género: ${context.gender}
Altura: ${context.height} cm
Peso: ${context.weight} kg
Objetivo: ${context.goal}
Experiência: ${context.experience || "Não especificada"}
Dias disponíveis: ${context.available_days || "Não especificados"}
Condições de saúde: ${context.health_conditions || "Nenhuma"}
Preferências de exercício: ${context.exercise_preferences || "Não especificadas"}
Restrições alimentares: ${context.dietary_restrictions || "Nenhuma"}
Equipamento disponível: ${context.equipment || "Não especificado"}
Motivação: ${context.motivation || "Não especificada"}

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
      max_tokens: 10000,
      temperature: 0.5,
    });

    return completion.choices[0].message?.content || "Plano não gerado.";
  } catch (error) {
    return "Ocorreu um erro ao gerar o plano de treino.";
  }
}

export async function detectHumanSupportRequest(
  message: string
): Promise<boolean> {
  const systemPrompt = `
És um assistente especializado em análise de intenções. Determina se a mensagem indica desejo de falar com um humano.

Responde APENAS com "SIM" ou "NÃO".

Exemplos:
- "Quero falar com uma pessoa" → SIM
- "Estou frustrado com o bot" → SIM
- "Qual é o meu plano de treino?" → NÃO
- "Pode me passar para suporte humano?" → SIM

SIM se: Pedido explícito por humano, frustração com IA.
NÃO para: Perguntas normais, conversas casuais.
`;

  const userPrompt = `Mensagem a analisar: "${message}"

Esta mensagem indica que a pessoa quer falar com um humano em vez da IA?`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 20,
      temperature: 0.1, // Baixa temperatura para respostas mais consistentes
    });

    const response = completion.choices[0].message?.content
      ?.trim()
      .toUpperCase();
    return response === "SIM";
  } catch (error) {
    console.error("❌ Erro ao detectar solicitação de suporte humano:", error);
    // Em caso de erro, retorna false para não interromper o fluxo
    return false;
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
Experiência: ${context.experience || "Não especificada"}
Dias disponíveis: ${context.available_days || "Não especificados"}
Condições de saúde: ${context.health_conditions || "Nenhuma"}
Preferências de exercício: ${
    context.exercise_preferences || "Não especificadas"
  }
Restrições alimentares: ${context.dietary_restrictions || "Nenhuma"}
Equipamento disponível: ${context.equipment || "Não especificado"}
Motivação: ${context.motivation || "Não especificada"}
`;

  const userMessage: Message = {
    role: "user",
    content: `
${userProfile}

Plano personalizado do cliente:
${planoTexto ? planoTexto : "[Plano não encontrado]"}

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
      max_tokens: 800,
      temperature: 0.7,
    });

    const answer =
      completion.choices[0].message?.content ||
      "Não foi possível gerar uma resposta.";

    return answer;
  } catch (error) {
    return "Ocorreu um erro ao obter resposta da inteligência artificial.";
  }
}

// Admin AI Chat - Função para o admin conversar com a IA sobre dados da base de dados
export async function chatWithAdminAI(
  message: string,
  conversationId: string
): Promise<string> {
  try {
    // Verificar se a conversa existe
    const conversation = await getAdminConversation(conversationId);
    if (!conversation) {
      throw new Error("Conversa não encontrada");
    }

    // Recuperar histórico da conversa específica
    const adminHistory = await getAdminChatHistory(conversationId);

    // Salvar mensagem do usuário no histórico
    await saveAdminChatMessage(conversationId, {
      role: "user",
      content: message,
    });

    // Ler o schema da base de dados dinamicamente
    let dbSchema = "";
    try {
      dbSchema = await readFile(
        require.resolve("../../databaseSchema.sql"),
        "utf-8"
      );
    } catch (err) {
      dbSchema = "-- Erro ao ler databaseSchema.sql";
    }

    // Primeiro, usar IA para determinar que dados buscar e construir a query
    const queryAnalysisPrompt = `
És um especialista em análise de dados e SQL. Analisa a pergunta do admin e determina queries necessárias.

ESQUEMA DA BASE DE DADOS:
${dbSchema}

Regras:
- Para telefones: Se não começa com 351, prefixa com 351 (ex: 912345678 → 351912345678)
- Evita subselects; faz queries sequenciais.
- Para contagens: use "select": "count"
- Responde apenas JSON.

Exemplo JSON:
{
  "needsQuery": true,
  "queries": [
    {
      "table": "clients",
      "select": "id",
      "where": "phone = '351912345678'",
      "description": "Obter ID do cliente"
    },
    {
      "table": "plans",
      "select": "*",
      "where": "client_id = {id_obtido_na_primeira_query}",
      "description": "Obter planos do cliente"
    }
  ]
}
`;

    const queryAnalysis = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: queryAnalysisPrompt },
        { role: "user", content: `Pergunta atual: ${message}` },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });

    const queryResponse = queryAnalysis.choices[0].message?.content;
    let queryData: any = {};

    try {
      // Extrair JSON do markdown se necessário
      let jsonString = queryResponse || '{"needsQuery": false, "queries": []}';
      // Se a resposta contém blocos de código markdown, extrair o JSON
      const jsonMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      queryData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta de análise:", parseError);
      console.error("Resposta original:", queryResponse);
      queryData = { needsQuery: false, queries: [] };
    }

    // LOG: Pergunta do usuário e query gerada pela IA
    console.log("[ADMIN AI CHAT]", {
      pergunta: message,
      queryGeradaPelaIA: JSON.stringify(queryData, null, 2),
    });

    let databaseResults = "";

    // Se precisar de queries, executá-las
    if (
      queryData.needsQuery &&
      queryData.queries &&
      queryData.queries.length > 0
    ) {
      const queryResults = [];
      let idDoClienteObtido: string | null = null;

      for (let i = 0; i < queryData.queries.length; i++) {
        const query = { ...queryData.queries[i] };

        // Substituir placeholder 'id_do_cliente' pelo valor real, se já foi obtido
        if (idDoClienteObtido && query.where && query.where.includes("id_do_cliente")) {
          query.where = query.where.replace(/'id_do_cliente'/g, `'${idDoClienteObtido}'`).replace(/id_do_cliente/g, idDoClienteObtido);
        }

        // Substituir placeholder '{id_obtido_na_primeira_query}' pelo valor real, se já foi obtido
        if (idDoClienteObtido && query.where && query.where.includes("{id_obtido_na_primeira_query}")) {
          query.where = query.where.replace(/{id_obtido_na_primeira_query}/g, idDoClienteObtido);
        }

        try {
          let supabaseQuery = supabase.from(query.table);
          let isCountQuery = false;

          // Verificar se é uma query de contagem
          if (
            query.select &&
            (query.select.toLowerCase().includes("count") ||
              query.select === "*")
          ) {
            if (query.select.toLowerCase().includes("count")) {
              isCountQuery = true;
              supabaseQuery = supabaseQuery.select("*", {
                count: "exact",
                head: true,
              });
            } else {
              supabaseQuery = supabaseQuery.select(query.select);
            }
          } else if (query.select) {
            supabaseQuery = supabaseQuery.select(query.select);
          } else {
            supabaseQuery = supabaseQuery.select("*");
          }

          // Aplicar where conditions (parsing melhorado)
          if (query.where) {
            const whereConditions = query.where.split(" AND ");
            for (const condition of whereConditions) {
              const trimmedCondition = condition.trim();

              // Parsing para diferentes tipos de condições
              if (trimmedCondition.includes("=")) {
                const [field, value] = trimmedCondition
                  .split("=")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");

                // Converter valores booleanos
                if (cleanValue.toLowerCase() === "true") {
                  supabaseQuery = supabaseQuery.eq(field, true);
                } else if (cleanValue.toLowerCase() === "false") {
                  supabaseQuery = supabaseQuery.eq(field, false);
                } else {
                  supabaseQuery = supabaseQuery.eq(field, cleanValue);
                }
              } else if (trimmedCondition.includes("!=")) {
                const [field, value] = trimmedCondition
                  .split("!=")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");
                supabaseQuery = supabaseQuery.neq(field, cleanValue);
              } else if (trimmedCondition.includes(">=")) {
                const [field, value] = trimmedCondition
                  .split(">=")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");
                supabaseQuery = supabaseQuery.gte(field, cleanValue);
              } else if (trimmedCondition.includes("<=")) {
                const [field, value] = trimmedCondition
                  .split("<=")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");
                supabaseQuery = supabaseQuery.lte(field, cleanValue);
              } else if (trimmedCondition.includes(">")) {
                const [field, value] = trimmedCondition
                  .split(">")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");
                supabaseQuery = supabaseQuery.gt(field, cleanValue);
              } else if (trimmedCondition.includes("<")) {
                const [field, value] = trimmedCondition
                  .split("<")
                  .map((s: string) => s.trim());
                const cleanValue = value.replace(/['"]/g, "");
                supabaseQuery = supabaseQuery.lt(field, cleanValue);
              }
            }
          }

          // Aplicar ordenação
          if (query.orderBy && !isCountQuery) {
            const [field, direction] = query.orderBy.split(" ");
            supabaseQuery = supabaseQuery.order(field, {
              ascending: direction?.toLowerCase() !== "desc",
            });
          }

          // Aplicar limit (não aplicar em queries de contagem)
          if (query.limit && !isCountQuery) {
            supabaseQuery = supabaseQuery.limit(query.limit);
          }

          const { data, error, count } = await supabaseQuery;

          // Se esta é a primeira query e retorna um id de cliente, salvar para usar nas próximas
          if (
            i === 0 &&
            query.table === "clients" &&
            query.select &&
            query.select.replace(/\s/g, "") === "id" &&
            data &&
            Array.isArray(data) &&
            data.length > 0 &&
            data[0].id
          ) {
            idDoClienteObtido = data[0].id;
          }

          if (error) {
            console.error(`Erro na query ${query.table}:`, error);
            queryResults.push({
              table: query.table,
              description: query.description,
              error: error.message,
              data: null,
            });
          } else {
            queryResults.push({
              table: query.table,
              description: query.description,
              data: isCountQuery ? null : data,
              count: isCountQuery ? count : data?.length || 0,
            });
          }
        } catch (queryError) {
          console.error(`Erro ao executar query ${query.table}:`, queryError);
          queryResults.push({
            table: query.table,
            description: query.description,
            error: "Erro ao executar query",
            data: null,
          });
        }
      }

      // Formatar resultados para o contexto da IA
      databaseResults = queryResults
        .map((result) => {
          if (result.error) {
            return `${result.description}: Erro - ${result.error}`;
          }
          return `${result.description}: ${
            result.count
          } registos encontrados\n${JSON.stringify(result.data, null, 2)}`;
        })
        .join("\n\n");
    }

    // Agora usar a IA para interpretar os resultados e responder
    const interpretationPrompt = `
És um assistente de IA para análise de dados. Responde sempre em Português de Portugal, de forma clara e profissional. Fornece insights, tendências e responde diretamente à pergunta.

Estrutura da resposta:
1. Resumo dos dados
2. Análise e insights
3. Recomendações se aplicável

Contexto: ${adminHistory.length > 0 ? adminHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n") : "Esta é a primeira interação"}
Dados: ${databaseResults || 'Nenhum dado necessário.'}
`;

    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: interpretationPrompt },
        { role: "user", content: `Pergunta original: ${message}` },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const aiResponse =
      finalResponse.choices[0].message?.content ||
      "Não foi possível gerar uma resposta.";

    // Salvar resposta da IA no histórico (isso também vai gerar o título automaticamente)
    await saveAdminChatMessage(conversationId, {
      role: "assistant",
      content: aiResponse,
    });

    return aiResponse;
  } catch (error) {
    console.error("❌ Erro no chat com IA admin:", error);
    const errorMessage =
      "Ocorreu um erro ao processar sua pergunta. Tente novamente ou verifique os logs para mais detalhes.";

    // Salvar mensagem de erro no histórico
    try {
      await saveAdminChatMessage(conversationId, {
        role: "assistant",
        content: errorMessage,
      });
    } catch (saveError) {
      console.error("❌ Erro ao salvar mensagem de erro:", saveError);
    }

    return errorMessage;
  }
}

// Gerar título de conversa usando IA
export async function generateConversationTitleWithAI(
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  try {
    // Se não há histórico, retornar título padrão
    if (conversationHistory.length === 0) {
      return "Nova Conversa";
    }

    // Pegar as primeiras mensagens da conversa (máximo 5 para não sobrecarregar)
    const recentMessages = conversationHistory.slice(0, 5);
    
    const systemPrompt = `
És especialista em títulos. Cria títulos de no máximo 6 palavras em Português de Portugal, descritivos e concisos.

Exemplos:
- Pergunta sobre stats: "Estatísticas de Clientes"
- Sobre planos: "Análise Planos Pendentes"

Responde apenas o título.
`;

    const userPrompt = `
Histórico da conversa:
${recentMessages.map((msg, index) => `${msg.role}: ${msg.content}`).join('\n')}

Cria um título curto e descritivo para esta conversa:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 100,
      temperature: 0.3, // Baixa temperatura para títulos mais consistentes
    });

    const title = completion.choices[0].message?.content?.trim() || "Nova Conversa";
    
    // Limpar o título de possíveis aspas ou pontuação extra
    const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/[.!?]+$/, '');
    
    return cleanTitle || "Nova Conversa";
  } catch (error) {
    console.error("❌ Erro ao gerar título da conversa:", error);
    return "Nova Conversa";
  }
}
