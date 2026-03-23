import OpenAI from 'openai'
import { z } from 'zod'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

const SYSTEM_PROMPT = `You are an idea extraction specialist. Take raw unstructured input
(notes, transcripts, articles, voice memos) and extract the core idea.

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "title": "5-8 word title that captures the essence",
  "problem": "The specific problem this solves (1-2 sentences)",
  "solution": "The proposed solution (1-2 sentences)",
  "target_audience": "Who would use this (specific, not generic)",
  "sector": "One of: tech, health, finance, education, travel, food, sports, entertainment, productivity, other",
  "elevator_pitch": "One sentence. What it is, for whom, why it matters.",
  "confidence": 0.0,
  "search_keywords": ["keyword1", "keyword2"]
}

Rules:
- NEVER invent details not present in the input
- Be specific, not generic
- If input is too vague, set confidence below 0.4
- search_keywords: 5-8 terms useful for market research`

type ExtractedIdea = {
  title: string
  problem: string
  solution: string
  target_audience: string
  sector: string
  elevator_pitch: string
  confidence: number
  search_keywords: string[]
}

const extractedIdeaSchema: z.ZodType<ExtractedIdea> = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  solution: z.string().min(1),
  target_audience: z.string().min(1),
  sector: z.string().min(1),
  elevator_pitch: z.string().min(1),
  confidence: z.number(),
  search_keywords: z.array(z.string()),
})

const stripMarkdownCodeFence = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function extractIdea(rawText: string, hintSector?: string): Promise<ExtractedIdea> {
  const response = await client.chat.completions.create({
    model: process.env.EXTRACTION_MODEL || 'openai/gpt-oss-20b:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract the idea from this input:\n\n${rawText}${hintSector ? `\n\nHint: user is interested in the ${hintSector} sector` : ''}`,
      },
    ],
    temperature: 0.2,
  })

  const text = response.choices[0]?.message?.content || '{}'
  const cleaned = stripMarkdownCodeFence(text)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Extractor returned non-JSON response')
  }

  return extractedIdeaSchema.parse(parsed)
}
