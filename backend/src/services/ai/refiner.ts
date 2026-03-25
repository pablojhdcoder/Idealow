import { APIError } from 'openai'
import { z } from 'zod'
import { config } from '../../config'
import { HttpError } from '../../lib/httpError'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from './chatCompletionSamplingFallback'
import { completionContentToPlainText } from './openaiMessageText'

const QUESTIONS_PROMPT = `You are a product strategist helping refine an idea before market validation.

Generate exactly 5 refinement questions. Each must:
- Be concrete and specific to THIS idea (never generic)
- Have 3-4 meaningfully different answer options
- Always include a "Something else" option with id "custom"
- Be answerable in under 10 seconds

Return ONLY this JSON, no markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "context": "One sentence: why this matters for validation",
      "options": [
        { "id": "a", "label": "Short label", "detail": "Optional brief explanation" },
        { "id": "b", "label": "...", "detail": "..." },
        { "id": "c", "label": "...", "detail": "..." },
        { "id": "custom", "label": "Something else", "detail": null }
      ]
    }
  ]
}

Topics must cover in this order:
1. Who specifically PAYS for this (not just uses it)
2. The main competing solution they currently use
3. The ONE feature without which this product doesn't exist
4. The most realistic first distribution channel
5. Timeline to first paying customer`

const SYNTHESIS_PROMPT = `You are a product strategist. Combine the original idea with the user's 
refinement answers to produce a sharper, more concrete version.

Return ONLY this JSON, no markdown:
{
  "refined_title": "Sharper title based on answers",
  "elevator_pitch": "One sentence. What it is, for whom, why now.",
  "problem_statement": "2-3 sentences. Specific, painful, measurable.",
  "solution": "2-3 sentences. Concrete, differentiated.",
  "target_customer": "Hyper-specific description of who this is for",
  "monetization": "How it makes money. Be specific.",
  "mvp_feature": "The single feature that defines the MVP",
  "distribution": "First channel to get first 100 users",
  "why_now": "Why is this the right moment to build this?",
  "biggest_risk": "The one thing most likely to kill this idea",
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
    throw new HttpError(502, 'Refinement AI returned non-JSON', code)
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
          content: `Idea to refine:
Title: ${idea.title}
Problem: ${idea.problem}
Solution: ${idea.solution}
Target audience: ${idea.target_audience}
Sector: ${idea.sector}`,
        },
      ],
      temperature: 0.2,
    })
  } catch (e) {
    if (e instanceof APIError) {
      throw new HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'REFINE_AI_PROVIDER_ERROR')
    }
    throw e
  }

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const parsed = parseJsonOrThrow(text, 'REFINE_QUESTIONS_NON_JSON')
  const result = refinementQuestionsResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new HttpError(
      502,
      'Refinement questions: invalid AI response',
      'REFINE_QUESTIONS_INVALID',
      config.nodeEnv === 'development' ? result.error.flatten() : undefined,
    )
  }
  for (const q of result.data.questions) {
    const hasCustom = q.options.some(o => o.id === 'custom')
    if (!hasCustom) {
      throw new HttpError(
        502,
        'Refinement questions: missing custom option',
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
          content: `Original idea: ${JSON.stringify(originalIdea)}
User answers: ${JSON.stringify(answers)}
User profile: sectors=${userProfile.sectors.join(', ')}, goal=${userProfile.goal}`,
        },
      ],
      temperature: 0.2,
    })
  } catch (e) {
    if (e instanceof APIError) {
      throw new HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'REFINE_AI_PROVIDER_ERROR')
    }
    throw e
  }

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '{}'
  const parsed = parseJsonOrThrow(text, 'REFINE_SYNTHESIS_NON_JSON')
  const result = refinedIdeaSchema.safeParse(parsed)
  if (!result.success) {
    throw new HttpError(
      502,
      'Refinement synthesis: invalid AI response',
      'REFINE_SYNTHESIS_INVALID',
      config.nodeEnv === 'development' ? result.error.flatten() : undefined,
    )
  }
  return result.data
}
