# Command: Validation Engine

## Task
Motor de validación multi-fuente. Corre como job de BullMQ (async). Cada fuente en paralelo. Resultados streameados al frontend via SSE.

---

## `backend/src/workers/validationJob.ts`

```ts
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { config } from '../config'
import { validateReddit }      from '../services/validation/reddit'
import { validateTrends }      from '../services/validation/trends'
import { validateCompetitors } from '../services/validation/competitors'
import { validateSocial }      from '../services/validation/social'
import { aggregateScore }      from '../services/validation/aggregator'
import { prisma }              from '../lib/prisma'
import { sseClients }          from '../routes/validation'

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null })

export const validationQueue = new Queue('validation', { connection })

new Worker('validation', async job => {
  const { ideaId } = job.data
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } })
  if (!idea) return

  const refined = idea.refinedContent as any
  const emit = (data: object) => {
    const clients = sseClients.get(ideaId) || []
    clients.forEach(res => res.write(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Todas las fuentes en paralelo
  const [reddit, trends, competitors, social] = await Promise.allSettled([
    (async () => {
      emit({ source: 'reddit', status: 'searching' })
      const r = await validateReddit(refined)
      emit({ source: 'reddit', status: 'done', ...r })
      return r
    })(),
    (async () => {
      emit({ source: 'trends', status: 'searching' })
      const r = await validateTrends(refined)
      emit({ source: 'trends', status: 'done', ...r })
      return r
    })(),
    (async () => {
      emit({ source: 'competitors', status: 'searching' })
      const r = await validateCompetitors(refined)
      emit({ source: 'competitors', status: 'done', ...r })
      return r
    })(),
    (async () => {
      emit({ source: 'social', status: 'searching' })
      const r = await validateSocial(refined)
      emit({ source: 'social', status: 'done', ...r })
      return r
    })(),
  ])

  const results = {
    reddit:      reddit.status      === 'fulfilled' ? reddit.value      : null,
    trends:      trends.status      === 'fulfilled' ? trends.value      : null,
    competitors: competitors.status === 'fulfilled' ? competitors.value : null,
    social:      social.status      === 'fulfilled' ? social.value      : null,
  }

  const scoreReport = aggregateScore(results)

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      validationScore: scoreReport.validation_score,
      validationData:  { ...results, ...scoreReport },
      competitors:     results.competitors?.competitors || [],
      status:          'VALIDATED',
    }
  })

  emit({ type: 'complete', ...scoreReport })
}, { connection })
```

---

## `backend/src/routes/validation.ts`

```ts
import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { validationQueue } from '../workers/validationJob'

const router = Router()

// Map de ideaId → array de SSE response objects
export const sseClients = new Map<string, Response[]>()

// Trigger validation
router.post('/ideas/:id/validate', requireAuth, async (req, res) => {
  const { id } = req.params
  await validationQueue.add('validate', { ideaId: id })
  res.json({ status: 'queued', ideaId: id })
})

// SSE stream
router.get('/ideas/:id/validate/stream', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Registrar cliente
  const clients = sseClients.get(id) || []
  clients.push(res)
  sseClients.set(id, clients)

  // Cleanup al cerrar conexión
  req.on('close', () => {
    const updated = (sseClients.get(id) || []).filter(c => c !== res)
    sseClients.set(id, updated)
  })
})

export default router
```

---

## `backend/src/services/validation/reddit.ts`

```ts
import axios from 'axios'
import OpenAI from 'openai'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function validateReddit(idea: {
  elevator_pitch: string
  problem_statement: string
  search_keywords: string[]
}) {
  // 1. Generar queries de búsqueda de dolor
  const queriesRes = await client.chat.completions.create({
    model: process.env.VALIDATION_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{
      role: 'user',
      content: `Generate 6 Reddit search queries to find people COMPLAINING about this problem.
Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Return ONLY a JSON array of strings: ["query1", "query2", ...]`
    }],
    temperature: 0.2,
  })

  const queriesText = queriesRes.choices[0]?.message?.content || '[]'
  const queries: string[] = JSON.parse(queriesText)

  // 2. Buscar en Reddit (paralelo, sin API key)
  const searchResults = await Promise.allSettled(
    queries.map(q =>
      axios.get(`https://www.reddit.com/search.json`, {
        params: { q, sort: 'top', limit: 25, t: 'year' },
        headers: { 'User-Agent': 'Idealow/1.0' },
        timeout: 8000,
      })
    )
  )

  const posts = searchResults
    .filter(r => r.status === 'fulfilled')
    .flatMap((r: any) => r.value.data.data.children)
    .map((p: any) => ({
      title:     p.data.title,
      text:      (p.data.selftext || '').slice(0, 300),
      score:     p.data.score,
      subreddit: p.data.subreddit,
      url:       `https://reddit.com${p.data.permalink}`,
    }))
    .filter(p => p.score > 10)
    .slice(0, 40)

  // 3. Analizar con OpenRouter
  const analysisRes = await client.chat.completions.create({
    model: process.env.VALIDATION_MODEL || 'openai/gpt-oss-20b:free',
    messages: [{
      role: 'user',
      content: `Analyze these Reddit posts to measure pain signal for:
"${idea.elevator_pitch}"

Posts: ${JSON.stringify(posts)}

Return ONLY this JSON:
{
  "score": 0-100,
  "post_count": ${posts.length},
  "top_complaints": ["complaint1", "complaint2", "complaint3"],
  "failed_solutions": ["solution people tried but dislike"],
  "best_quote": { "text": "most powerful quote", "upvotes": 0, "url": "..." },
  "subreddits": ["r/example"],
  "summary": "2 sentence summary"
}`
    }],
    temperature: 0.2,
  })

  const text = analysisRes.choices[0]?.message?.content || '{}'
  return JSON.parse(text)
}
```

---

## `backend/src/services/validation/competitors.ts`

```ts
import OpenAI from 'openai'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

export async function validateCompetitors(idea: {
  elevator_pitch: string
  problem_statement: string
  search_keywords: string[]
}) {
  const response = await client.chat.completions.create({
    model: process.env.VALIDATION_ONLINE_MODEL || 'openai/gpt-oss-20b:free:online',
    messages: [{
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
}`
    }],
    temperature: 0.2,
  })

  const text = response.choices[0]?.message?.content || '{}'

  return JSON.parse(text)
}
```

---

## `backend/src/services/validation/aggregator.ts`

```ts
export function aggregateScore(results: Record<string, any>) {
  const weights = {
    reddit:      0.30,
    trends:      0.20,
    competitors: 0.25,
    social:      0.25,
  }

  let totalWeight = 0
  let weightedSum = 0

  for (const [source, weight] of Object.entries(weights)) {
    if (results[source]?.score != null) {
      weightedSum += results[source].score * weight
      totalWeight += weight
    }
  }

  const validation_score = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 0

  return {
    validation_score,
    verdict: getVerdict(validation_score),
    recommendation: getRecommendation(validation_score),
    breakdown: Object.fromEntries(
      Object.entries(weights).map(([source, weight]) => [
        source,
        {
          score:        results[source]?.score ?? null,
          weight,
          contribution: results[source]?.score != null
            ? Math.round(results[source].score * weight)
            : null,
        }
      ])
    )
  }
}

function getVerdict(score: number) {
  if (score >= 75) return 'STRONG_SIGNAL'
  if (score >= 55) return 'MODERATE_SIGNAL'
  if (score >= 35) return 'WEAK_SIGNAL'
  return 'NO_SIGNAL'
}

function getRecommendation(score: number) {
  if (score >= 75) return 'Strong market signals. Build the MVP now.'
  if (score >= 55) return 'Moderate signals. Validate further before building.'
  if (score >= 35) return 'Weak signals. Refine the problem or pivot the solution.'
  return 'No clear market signal. Reconsider the problem space.'
}
```

---

## Frontend: SSE Hook `src/hooks/useValidationStream.ts`

```ts
import { useEffect, useState } from 'react'

type SourceStatus = {
  status: 'idle' | 'searching' | 'done'
  score?: number
  summary?: string
}

type ValidationState = {
  reddit:      SourceStatus
  trends:      SourceStatus
  competitors: SourceStatus
  social:      SourceStatus
  complete:    boolean
  finalScore:  number | null
  verdict:     string | null
}

export function useValidationStream(ideaId: string | null) {
  const [state, setState] = useState<ValidationState>({
    reddit:      { status: 'idle' },
    trends:      { status: 'idle' },
    competitors: { status: 'idle' },
    social:      { status: 'idle' },
    complete:    false,
    finalScore:  null,
    verdict:     null,
  })

  useEffect(() => {
    if (!ideaId) return
    const es = new EventSource(`/api/ideas/${ideaId}/validate/stream`, { withCredentials: true })

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'complete') {
        setState(prev => ({
          ...prev,
          complete:   true,
          finalScore: data.validation_score,
          verdict:    data.verdict,
        }))
        es.close()
        return
      }

      if (data.source) {
        setState(prev => ({
          ...prev,
          [data.source]: { status: data.status, score: data.score, summary: data.summary }
        }))
      }
    }

    return () => es.close()
  }, [ideaId])

  return state
}
```

---

## Archivos a crear
- `backend/src/workers/validationJob.ts`
- `backend/src/routes/validation.ts`
- `backend/src/services/validation/reddit.ts`
- `backend/src/services/validation/trends.ts`
- `backend/src/services/validation/competitors.ts`
- `backend/src/services/validation/social.ts`
- `backend/src/services/validation/aggregator.ts`
- `frontend/src/hooks/useValidationStream.ts`
- `frontend/src/components/ideas/ValidationProgress.tsx`
- `frontend/src/components/ideas/ScoreRing.tsx`
