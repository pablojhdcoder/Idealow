import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import type { ValidationIdeaInput } from './types'
import { parseJsonObject } from './parseAiJson'

/**
 * Sin API oficial de Trends en el backend: se usa el modelo para estimar
 * momentum de interés a partir de keywords (heurística documentada).
 */
const trendsSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  summary: z.string().optional(),
  related_topics: z.array(z.string()).optional(),
})

export type TrendsValidationResult = z.infer<typeof trendsSchema> & {
  explore_links?: { label: string; url: string }[]
}

export async function validateTrends(idea: ValidationIdeaInput): Promise<TrendsValidationResult> {
  const client = getAzureOpenAIClient()
  const kw = idea.search_keywords.join(', ')

  const res = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `Estimas el momentum relativo de interés (búsquedas / conversación cultural) para estas keywords de producto durante los próximos 12 meses (NO es asesoramiento financiero).

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${kw}

Devuelve SOLO JSON:
{
  "score": 0-100 (más alto = más probable que la gente busque / hable de este espacio de problema),
  "summary": "2 frases en español explicando la estimación",
  "related_topics": ["topic1", "topic2", "topic3"]
}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(res.choices[0]?.message?.content) || '{}'
  const parsed = trendsSchema.safeParse(parseJsonObject(text))
  if (!parsed.success) {
    return {
      score: 40,
      summary: 'Señal de tendencia no disponible (JSON del modelo inválido). Se aplicó un valor neutral.',
      related_topics: [],
      explore_links: [],
    }
  }
  const topics = parsed.data.related_topics ?? []
  const explore_links = topics.slice(0, 10).map(label => ({
    label,
    url: `https://www.google.com/search?q=${encodeURIComponent(label)}`,
  }))
  return { ...parsed.data, explore_links }
}
