import { APIError } from 'openai'
import { z } from 'zod'
import { config } from '../../config'
import { HttpError } from '../../lib/httpError'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from './chatCompletionSamplingFallback'
import { completionContentToPlainText } from './openaiMessageText'

const QUESTIONS_PROMPT = `Eres un estratega de producto que ayuda a refinar una idea antes de la validación de mercado.

Genera exactamente 5 preguntas de refinamiento. Cada una debe:
- Ser concreta y específica para ESTA idea (nunca genérica)
- Tener 3-4 opciones de respuesta claramente diferentes
- Incluir siempre una opción "Otra" con id "custom"
- Poder responderse en menos de 10 segundos

Devuelve SOLO este JSON, sin markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "Texto de la pregunta aquí",
      "context": "Una frase: por qué esto importa para la validación",
      "options": [
        { "id": "a", "label": "Etiqueta corta", "detail": "Breve explicación opcional" },
        { "id": "b", "label": "...", "detail": "..." },
        { "id": "c", "label": "...", "detail": "..." },
        { "id": "custom", "label": "Otra", "detail": null }
      ]
    }
  ]
}

Los temas deben cubrirse en este orden:
1. Quién PAGA específicamente por esto (no solo quién lo usa)
2. La principal alternativa/solución competidora que usan ahora
3. La ÚNICA funcionalidad sin la cual este producto no existe
4. El primer canal de distribución más realista
5. Tiempo estimado hasta el primer cliente de pago`

const SYNTHESIS_PROMPT = `Eres un estratega de producto. Combina la idea original con las respuestas de refinamiento del usuario
para producir una versión más nítida, concreta y accionable.

Devuelve SOLO este JSON, sin markdown:
{
  "refined_title": "Título más claro basado en las respuestas",
  "elevator_pitch": "Una frase. Qué es, para quién y por qué ahora.",
  "problem_statement": "2-3 frases. Específico, doloroso y medible.",
  "solution": "2-3 frases. Concreto y diferencial.",
  "target_customer": "Descripción muy específica de quién es el cliente",
  "monetization": "Cómo gana dinero. Sé específico.",
  "mvp_feature": "La funcionalidad única que define el MVP",
  "distribution": "Primer canal para conseguir los primeros 100 usuarios",
  "why_now": "Por qué este es el momento adecuado para construirlo",
  "biggest_risk": "Lo único con más probabilidades de matar la idea",
  "search_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`

const refinementOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().nullable().optional(),
})

const refinementQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  context: z.string().min(1),
  options: z.array(refinementOptionSchema).min(3).max(6),
})

export const refinementQuestionsResponseSchema = z.object({
  questions: z.array(refinementQuestionSchema).length(5),
})

export type RefinementQuestionsResponse = z.infer<typeof refinementQuestionsResponseSchema>

const refinedIdeaSchema = z.object({
  refined_title: z.string().min(1),
  elevator_pitch: z.string().min(1),
  problem_statement: z.string().min(1),
  solution: z.string().min(1),
  target_customer: z.string().min(1),
  monetization: z.string().min(1),
  mvp_feature: z.string().min(1),
  distribution: z.string().min(1),
  why_now: z.string().min(1),
  biggest_risk: z.string().min(1),
  search_keywords: z.array(z.string()).min(3).max(12),
})

export type RefinedIdeaPayload = z.infer<typeof refinedIdeaSchema>

export type RefinementAnswerInput = { questionId: string; answer: string }

const stripMarkdownCodeFence = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function parseJsonOrThrow(raw: string, code: string): unknown {
  const cleaned = stripMarkdownCodeFence(raw)
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new HttpError(502, 'La IA de refinamiento devolvió una respuesta que no es JSON', code)
  }
}

export async function generateQuestions(idea: {
  title: string
  problem: string
  solution: string
  target_audience: string
  sector: string
}): Promise<RefinementQuestionsResponse> {
  const client = getAzureOpenAIClient()
  let response
  try {
    response = await chatCompletionsCreateWithSamplingFallback(client, {
      model: config.azure.deploymentChat,
      messages: [
        { role: 'system', content: QUESTIONS_PROMPT },
        {
          role: 'user',
          content: `Idea a refinar:
Título: ${idea.title}
Problema: ${idea.problem}
Solución: ${idea.solution}
Cliente objetivo: ${idea.target_audience}
Sector: ${idea.sector}`,
        },
      ],
      temperature: 0.2,
    })
  } catch (e) {
    if (e instanceof APIError) {
      throw new HttpError(
        502,
        `Error de Microsoft Foundry / Azure OpenAI: ${e.message}`,
        'REFINE_AI_PROVIDER_ERROR',
      )
    }
    throw e
  }

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const parsed = parseJsonOrThrow(text, 'REFINE_QUESTIONS_NON_JSON')
  const result = refinementQuestionsResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new HttpError(
      502,
      'Las preguntas de refinamiento: respuesta de IA no válida',
      'REFINE_QUESTIONS_INVALID',
      config.nodeEnv === 'development' ? result.error.flatten() : undefined,
    )
  }
  for (const q of result.data.questions) {
    const hasCustom = q.options.some(o => o.id === 'custom')
    if (!hasCustom) {
      throw new HttpError(
        502,
        'Las preguntas de refinamiento: falta la opción personalizada',
        'REFINE_QUESTIONS_INVALID',
      )
    }
  }
  return result.data
}

export async function synthesizeAnswers(
  originalIdea: object,
  answers: RefinementAnswerInput[],
  userProfile: { sectors: string[]; goal: string },
): Promise<RefinedIdeaPayload> {
  const client = getAzureOpenAIClient()
  let response
  try {
    response = await chatCompletionsCreateWithSamplingFallback(client, {
      model: config.azure.deploymentChat,
      messages: [
        { role: 'system', content: SYNTHESIS_PROMPT },
        {
          role: 'user',
          content: `Idea original: ${JSON.stringify(originalIdea)}
Respuestas del usuario: ${JSON.stringify(answers)}
Perfil del usuario: sectores=${userProfile.sectors.join(', ')}, objetivo=${userProfile.goal}`,
        },
      ],
      temperature: 0.2,
    })
  } catch (e) {
    if (e instanceof APIError) {
      throw new HttpError(
        502,
        `Error de Microsoft Foundry / Azure OpenAI: ${e.message}`,
        'REFINE_AI_PROVIDER_ERROR',
      )
    }
    throw e
  }

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const parsed = parseJsonOrThrow(text, 'REFINE_SYNTHESIS_NON_JSON')
  const result = refinedIdeaSchema.safeParse(parsed)
  if (!result.success) {
    throw new HttpError(
      502,
      'La síntesis de refinamiento: respuesta de IA no válida',
      'REFINE_SYNTHESIS_INVALID',
      config.nodeEnv === 'development' ? result.error.flatten() : undefined,
    )
  }
  return result.data
}
