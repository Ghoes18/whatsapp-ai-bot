import OpenAI from "openai";
import dotenv from "dotenv";
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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTrainingPlan(
  context: ClientContext
): Promise<string> {
  const prompt = `
Crie um plano de treino personalizado e detalhado para a pessoa com o seguinte perfil:

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

Apresente o plano de forma clara e estruturada, dividido em seções para treino, alimentação e cuidados.

Obrigado.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });
  return completion.choices[0].message?.content || "Plano não gerado.";
}
