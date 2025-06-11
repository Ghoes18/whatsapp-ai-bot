# Novos Campos do Cliente - Guia de Implementação

## Resumo das Mudanças

Foram adicionados 6 novos campos à tabela `clients` para coletar informações mais detalhadas sobre os clientes:

- **experience**: Nível de experiência com exercícios
- **available_days**: Dias disponíveis para treino
- **health_conditions**: Condições de saúde ou lesões
- **exercise_preferences**: Preferências de exercícios
- **equipment**: Equipamento disponível
- **motivation**: Motivação principal para treinar

## Arquivos Modificados

### 1. Base de Dados
- `databaseSchema.sql` - Schema atualizado com novos campos
- `databaseOptimization.sql` - Comandos de otimização e novos campos
- `update_database.sql` - Script específico para aplicar mudanças

### 2. Backend
- `src/webhookHandler.ts` - Fluxo de coleta de dados expandido
- `src/services/openaiService.ts` - Prompts atualizados para usar novos dados
- `src/services/dashboardService.ts` - Interface Client atualizada

## Como Aplicar as Mudanças

### 1. Atualizar a Base de Dados

Execute o script SQL no seu Supabase:

```sql
-- Execute o arquivo update_database.sql no SQL Editor do Supabase
```

Ou execute os comandos manualmente:

```sql
-- Adicionar novos campos
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS experience text,
ADD COLUMN IF NOT EXISTS available_days text,
ADD COLUMN IF NOT EXISTS health_conditions text,
ADD COLUMN IF NOT EXISTS exercise_preferences text,
ADD COLUMN IF NOT EXISTS equipment text,
ADD COLUMN IF NOT EXISTS motivation text;

-- Atualizar clientes existentes
UPDATE public.clients 
SET 
  experience = COALESCE(experience, 'Não especificada'),
  available_days = COALESCE(available_days, 'Não especificados'),
  health_conditions = COALESCE(health_conditions, 'Nenhuma'),
  exercise_preferences = COALESCE(exercise_preferences, 'Não especificadas'),
  equipment = COALESCE(equipment, 'Não especificado'),
  motivation = COALESCE(motivation, 'Não especificada')
WHERE experience IS NULL 
   OR available_days IS NULL 
   OR health_conditions IS NULL 
   OR exercise_preferences IS NULL 
   OR equipment IS NULL 
   OR motivation IS NULL;
```

### 2. Deploy do Backend

1. Faça commit das mudanças no código
2. Deploy para o servidor
3. Reinicie o serviço se necessário

### 3. Testar o Fluxo

1. Inicie uma nova conversa com um cliente
2. Verifique se todos os novos campos são coletados sequencialmente:
   - Nome
   - Idade
   - Objetivo
   - Gênero
   - Altura
   - Peso
   - **Experiência** (novo)
   - **Dias disponíveis** (novo)
   - **Condições de saúde** (novo)
   - **Preferências de exercício** (novo)
   - **Restrições alimentares** (novo)
   - **Equipamento** (novo)
   - **Motivação** (novo)

## Fluxo de Coleta Atualizado

O fluxo agora coleta 13 informações em vez de 6:

1. **Nome** - "Olá! Qual o seu nome?"
2. **Idade** - "Prazer, [nome]! Qual sua idade?"
3. **Objetivo** - "Qual seu objetivo principal? (ex: emagrecer, ganhar massa, etc)"
4. **Gênero** - "Qual seu gênero? (masculino/feminino)"
5. **Altura** - "Qual sua altura em cm? (ex: 175)"
6. **Peso** - "Qual seu peso atual em kg? (ex: 70)"
7. **Experiência** - "Qual sua experiência com exercícios? (iniciante, intermediário, avançado)"
8. **Dias disponíveis** - "Quantos dias por semana pode treinar? (ex: 3 dias, 5 dias)"
9. **Condições de saúde** - "Tem alguma condição de saúde ou lesão que deva considerar? (se não, responda 'nenhuma')"
10. **Preferências de exercício** - "Que tipo de exercícios prefere? (ex: musculação, cardio, yoga, funcional)"
11. **Restrições alimentares** - "Tem restrições alimentares ou alergias? (se não, responda 'nenhuma')"
12. **Equipamento** - "Que equipamento tem disponível? (ex: halteres, elásticos, apenas peso corporal)"
13. **Motivação** - "Qual é a sua principal motivação para treinar? (ex: saúde, estética, competição)"

## Impacto nos Planos Gerados

Os planos gerados pela IA agora incluirão:

- Recomendações baseadas no nível de experiência
- Frequência adaptada aos dias disponíveis
- Considerações de saúde e lesões
- Exercícios alinhados com preferências
- Adaptações para restrições alimentares
- Exercícios compatíveis com equipamento disponível
- Mensagens motivacionais personalizadas

## Compatibilidade

- ✅ Clientes existentes continuam funcionando
- ✅ Novos campos têm valores padrão para clientes antigos
- ✅ Interface do dashboard suporta os novos campos
- ✅ API mantém compatibilidade

## Monitoramento

Após o deploy, monitore:

1. Se novos clientes estão fornecendo todos os dados
2. Se os planos gerados estão mais personalizados
3. Se há erros no fluxo de coleta
4. Performance da base de dados com os novos campos

## Rollback (se necessário)

Para reverter as mudanças:

```sql
-- Remover novos campos (CUIDADO: perde dados)
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS experience,
DROP COLUMN IF EXISTS available_days,
DROP COLUMN IF EXISTS health_conditions,
DROP COLUMN IF EXISTS exercise_preferences,
DROP COLUMN IF EXISTS equipment,
DROP COLUMN IF EXISTS motivation;
```

E reverta os commits do código. 