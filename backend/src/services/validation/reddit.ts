import axios from 'axios'
import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import { logger } from '../../lib/logger'
import type { ValidationIdeaInput } from './types'
import { parseJsonArray, parseJsonObject } from './parseAiJson'

/** Reddit JSON público + IA. API OAuth: https://www.reddit.com/dev/api/ */

const redditAnalysisSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  post_count: z.coerce.number().optional(),
  top_complaints: z.array(z.string()).optional(),
  failed_solutions: z.array(z.string()).optional(),
  best_quote: z
    .object({
      text: z.string(),
      upvotes: z.coerce.number().optional(),
      url: z.string().optional(),
    })
    .optional(),
  subreddits: z.array(z.string()).optional(),
  summary: z.string().optional(),
})

export type RedditValidationResult = z.infer<typeof redditAnalysisSchema>

export async function validateReddit(idea: ValidationIdeaInput): Promise<RedditValidationResult> {
  const client = getAzureOpenAIClient()

  const queriesRes = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `Generate 6 Reddit search queries to find people COMPLAINING about this problem.
Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Return ONLY a JSON array of strings: ["query1", "query2", ...]`,
      },
    ],
    temperature: 0.2,
  })

  const queriesText =
    completionContentToPlainText(queriesRes.choices[0]?.message?.content) || '[]'
  const queriesRaw = parseJsonArray(queriesText)
  const queries = queriesRaw.filter((q): q is string => typeof q === 'string').slice(0, 8)

  const searchResults = await Promise.allSettled(
    queries.map(q =>
      axios.get<{ data?: { children?: { data: Record<string, unknown> }[] } }>(
        'https://www.reddit.com/search.json',
        {
          params: { q, sort: 'top', limit: 25, t: 'year' },
          headers: { 'User-Agent': 'Idealow/1.0 (validation)' },
          timeout: 8000,
        },
      ),
    ),
  )

  const posts: {
    title: string
    text: string
    score: number
    subreddit: string
    url: string
  }[] = []

  for (const r of searchResults) {
    if (r.status !== 'fulfilled') continue
    const children = r.value.data?.data?.children
    if (!Array.isArray(children)) continue
    for (const p of children) {
      const d = p.data
      if (!d || typeof d !== 'object') continue
      const title = typeof d.title === 'string' ? d.title : ''
      const selftext = typeof d.selftext === 'string' ? d.selftext : ''
      const score = typeof d.score === 'number' ? d.score : 0
      const sub = typeof d.subreddit === 'string' ? d.subreddit : ''
      const permalink = typeof d.permalink === 'string' ? d.permalink : ''
      posts.push({
        title,
        text: selftext.slice(0, 300),
        score,
        subreddit: sub,
        url: permalink ? `https://reddit.com${permalink}` : '',
      })
    }
  }

  const filtered = posts.filter(p => p.score > 10).slice(0, 40)

  const analysisRes = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `Analyze these Reddit posts to measure pain signal for:
"${idea.elevator_pitch}"

Posts: ${JSON.stringify(filtered)}

Return ONLY this JSON:
{
  "score": 0-100,
  "post_count": ${filtered.length},
  "top_complaints": ["complaint1", "complaint2", "complaint3"],
  "failed_solutions": ["solution people tried but dislike"],
  "best_quote": { "text": "most powerful quote", "upvotes": 0, "url": "..." },
  "subreddits": ["r/example"],
  "summary": "2 sentence summary"
}`,
      },
    ],
    temperature: 0.2,
  })

  const text =
    completionContentToPlainText(analysisRes.choices[0]?.message?.content) || '{}'
  const obj = parseJsonObject(text)
  const parsed = redditAnalysisSchema.safeParse(obj)
  if (!parsed.success) {
    logger.warn({ err: parsed.error.flatten(), ideaPitch: idea.elevator_pitch }, 'reddit analysis parse failed')
    return {
      score: filtered.length >= 5 ? 45 : 20,
      post_count: filtered.length,
      summary: 'Could not parse AI analysis; score estimated from post volume.',
    }
  }
  return parsed.data
}
