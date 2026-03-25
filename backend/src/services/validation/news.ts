import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import { fetchGoogleNewsTitles } from './fetchGoogleNewsRss'
import { parseJsonObject } from './parseAiJson'
import type { ValidationIdeaInput } from './types'

const newsSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  summary: z.string().optional(),
  headline_count: z.coerce.number().optional(),
  /** 3-5 titulares más relevantes según el modelo */
  top_headlines: z.array(z.string()).optional(),
})

export type NewsValidationResult = z.infer<typeof newsSchema>

function buildNewsQuery(idea: ValidationIdeaInput): string {
  const kw = idea.search_keywords.slice(0, 5).join(' ')
  const problem = idea.problem_statement.replace(/\s+/g, ' ').trim().slice(0, 160)
  return `${kw} ${problem}`.trim().slice(0, 280)
}

/**
 * Actualidad: RSS de Google News (sin API key) + síntesis con IA.
 */
export async function validateNews(idea: ValidationIdeaInput): Promise<NewsValidationResult> {
  const query = buildNewsQuery(idea)
  const headlines = await fetchGoogleNewsTitles(query, 20)

  const client = getAzureOpenAIClient()
  const res = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `You analyze RECENT NEWS relevance for this idea (0-100). Headlines come from Google News RSS (public); there may be noise.

Headlines (${headlines.length}):
${JSON.stringify(headlines.slice(0, 18))}

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "2 sentences: is the problem/topic in the news cycle? timeliness?",
  "headline_count": ${headlines.length},
  "top_headlines": ["pick up to 5 most relevant real headlines from the list above only"]
}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(res.choices[0]?.message?.content) || '{}'
  const parsed = newsSchema.safeParse(parseJsonObject(text))
  if (!parsed.success) {
    const score = headlines.length >= 8 ? 48 : headlines.length >= 3 ? 35 : 18
    return {
      score,
      summary:
        'News angle estimated from headline count only (model JSON parse failed).',
      headline_count: headlines.length,
      top_headlines: headlines.slice(0, 5),
    }
  }
  return {
    ...parsed.data,
    headline_count: parsed.data.headline_count ?? headlines.length,
  }
}
