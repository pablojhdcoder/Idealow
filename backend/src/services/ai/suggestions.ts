import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from './chatCompletionSamplingFallback'
import { completionContentToPlainText } from './openaiMessageText'

type UserProfile = {
  sectors: string[]
  goal: string
  experienceLevel: string
}

const stripMarkdown = (v: string) =>
  v.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

export async function generateSuggestions(profile: UserProfile): Promise<string[]> {
  const client = getAzureOpenAIClient()
  const response = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentSuggestions,
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

  const text = completionContentToPlainText(response.choices[0]?.message?.content) || '[]'
  try {
    const parsed: unknown = JSON.parse(stripMarkdown(text))
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}
