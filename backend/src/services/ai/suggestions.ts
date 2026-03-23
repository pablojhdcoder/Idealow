import OpenAI from 'openai'
import { config } from '../../config'

const client = new OpenAI({
  apiKey: config.openrouterApiKey,
  baseURL: 'https://openrouter.ai/api/v1',
})

type UserProfile = {
  sectors: string[]
  goal: string
  experienceLevel: string
}

const stripMarkdown = (v: string) =>
  v.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

export async function generateSuggestions(profile: UserProfile): Promise<string[]> {
  const response = await client.chat.completions.create({
    model: process.env.EXTRACTION_MODEL ?? 'openai/gpt-oss-20b:free',
    messages: [
      {
        role: 'system',
        content:
          'You are an idea prompt generator. Return ONLY a JSON array of 5 short idea prompts (strings, max 15 words each). No markdown, no explanation.',
      },
      {
        role: 'user',
        content: `Generate 5 startup idea prompts for: sectors=${profile.sectors.join(', ')}, experience=${profile.experienceLevel}, goal=${profile.goal}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 400,
  })

  const text = response.choices[0]?.message?.content ?? '[]'
  try {
    const parsed: unknown = JSON.parse(stripMarkdown(text))
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}
