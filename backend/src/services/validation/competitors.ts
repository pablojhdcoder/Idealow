import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import { logger } from '../../lib/logger'
import type { ValidationIdeaInput } from './types'
import { parseJsonObject } from './parseAiJson'

const competitorEntrySchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  strength: z.string().optional(),
  weakness: z.string().optional(),
  approximate_users: z.string().optional(),
})

const competitorsSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  competitors: z.array(competitorEntrySchema).optional(),
  gap_analysis: z
    .object({
      gap: z.string().optional(),
      positioning: z.string().optional(),
      advantage: z.string().optional(),
    })
    .optional(),
  summary: z.string().optional(),
})

export type CompetitorsValidationResult = z.infer<typeof competitorsSchema>

export async function validateCompetitors(
  idea: ValidationIdeaInput,
): Promise<CompetitorsValidationResult> {
  const client = getAzureOpenAIClient()

  const response = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `Find competitors for this idea and analyze the market gap.
Title: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY this JSON:
{
  "score": 0-100,
  "competitors": [
    {
      "name": "...",
      "url": "...",
      "description": "...",
      "strength": "what they do well",
      "weakness": "their main gap from user reviews",
      "approximate_users": "..."
    }
  ],
  "gap_analysis": {
    "gap": "The clearest unmet need",
    "positioning": "How this idea should position itself",
    "advantage": "Key differentiator"
  },
  "summary": "2 sentence market overview"
}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const parsed = competitorsSchema.safeParse(parseJsonObject(text))
  if (!parsed.success) {
    logger.warn({ err: parsed.error.flatten() }, 'competitors validation parse failed')
    return {
      score: 50,
      competitors: [],
      summary: 'Competitor analysis could not be parsed; neutral score applied.',
    }
  }
  return parsed.data
}
