import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import { parseJsonObject } from './parseAiJson'
import type { ValidationIdeaInput } from './types'
import { youtubeSearchVideos } from './youtubeSearchVideos'

/** Estimación IA por red (no hay API en vivo ni posts reales). */
const aiPlatformEstimateSchema = z.object({
  signal: z.coerce.number().min(0).max(100),
  /** Qué temas, tono o tipos de contenido cabría esperar al “buscar” en esa red (sintético). */
  synthetic_findings: z.string(),
})

const aiSocialSearchSchema = z.object({
  x: aiPlatformEstimateSchema.optional(),
  instagram: aiPlatformEstimateSchema.optional(),
  tiktok: aiPlatformEstimateSchema.optional(),
})

const socialSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  summary: z.string().optional(),
  youtube_long_count: z.coerce.number().optional(),
  youtube_shorts_count: z.coerce.number().optional(),
  /** Búsqueda social simulada por IA: X, Instagram, TikTok. */
  ai_social_search: aiSocialSearchSchema.optional(),
  channels_researched: z.array(z.string()).optional(),
})

export type SocialValidationResult = z.infer<typeof socialSchema>
export type AiSocialSearchResult = z.infer<typeof aiSocialSearchSchema>

/**
 * Solo APIs gratuitas: YouTube Data API (cuota gratuita con clave).
 * X, Instagram y TikTok: solo inferencia del modelo (sin APIs de pago ni scraping).
 */
export async function validateSocial(idea: ValidationIdeaInput): Promise<SocialValidationResult> {
  const [ytLong, ytShort] = await Promise.all([
    youtubeSearchVideos(idea.search_keywords),
    youtubeSearchVideos(idea.search_keywords, { videoDuration: 'short' }),
  ])

  const channelsResearched: string[] = [
    'ai_x_estimate',
    'ai_instagram_estimate',
    'ai_tiktok_estimate',
  ]
  if (config.youtubeApiKey.trim()) {
    channelsResearched.unshift('youtube', 'youtube_shorts')
  }

  const client = getAzureOpenAIClient()

  const res = await chatCompletionsCreateWithSamplingFallback(client, {
    model: config.azure.deploymentChat,
    messages: [
      {
        role: 'user',
        content: `You assess social / video market signal (0-100) for a product idea.

## Real data (YouTube Data API only — free tier with API key)
- General video search: ${ytLong.count} results. Sample titles: ${JSON.stringify(ytLong.titles)}
- Short-form oriented search (Shorts): ${ytShort.count} results. Sample titles: ${JSON.stringify(ytShort.titles)}

## Simulated “social search” for X, Instagram, TikTok (AI only — NO APIs, NO live web)
You cannot access these platforms. For each of X (Twitter), Instagram, and TikTok, produce a **synthetic** estimate of what a search around this idea might surface: typical post themes, creator angles, hashtags or formats, and rough sentiment/noise. This is **not** real posts or counts — training knowledge + reasoning only. Use short Spanish for "synthetic_findings" (2-3 sentences each). Platform-specific hints:
- **X**: threads, news, complaints, niche communities.
- **Instagram**: Reels, aesthetics, influencers, SMB/lifestyle.
- **TikTok**: trends, challenges, duets, Gen-Z tone.

Each platform gets a numeric "signal" field from 0 to 100 (how strong/relevant the discourse around this idea would likely be).

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "3-4 sentences in Spanish: YouTube first if relevant; then one line stating X/IG/TikTok blocks are AI estimates, not live data",
  "youtube_long_count": ${ytLong.count},
  "youtube_shorts_count": ${ytShort.count},
  "ai_social_search": {
    "x": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" },
    "instagram": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" },
    "tiktok": { "signal": 0-100, "synthetic_findings": "Spanish, 2-3 sentences" }
  },
  "channels_researched": ${JSON.stringify(channelsResearched)}
}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(res.choices[0]?.message?.content) || '{}'
  const parsed = socialSchema.safeParse(parseJsonObject(text))
  if (!parsed.success) {
    const base = ytLong.count + ytShort.count > 0 ? 40 : 20
    return {
      score: base,
      summary:
        'No se pudo parsear el JSON del modelo. Solo datos de YouTube si hay clave. Configura YOUTUBE_API_KEY (cuota gratuita).',
      youtube_long_count: ytLong.count,
      youtube_shorts_count: ytShort.count,
      channels_researched: channelsResearched,
    }
  }
  return {
    ...parsed.data,
    youtube_long_count: parsed.data.youtube_long_count ?? ytLong.count,
    youtube_shorts_count: parsed.data.youtube_shorts_count ?? ytShort.count,
    channels_researched: parsed.data.channels_researched ?? channelsResearched,
  }
}
