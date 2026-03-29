import { z } from 'zod'
import { config } from '../../config'
import { getAzureOpenAIClient } from '../../lib/azureOpenAI'
import { chatCompletionsCreateWithSamplingFallback } from '../ai/chatCompletionSamplingFallback'
import { completionContentToPlainText } from '../ai/openaiMessageText'
import { parseJsonObject } from './parseAiJson'
import type { ValidationIdeaInput } from './types'
import { youtubeSearchVideos, type YoutubeVideoSample } from './youtubeSearchVideos'
import { buildSocialEvidenceUrl, type SocialEvidencePlatform } from './socialEvidenceUrls'

/** Estimación IA por red + consultas que convertimos en enlaces de búsqueda reales (sin inventar URLs a posts). */
const evidenceQuerySchema = z.object({
  label: z.string(),
  query: z.string(),
})

const aiPlatformEstimateSchema = z.object({
  signal: z.coerce.number().min(0).max(100),
  /** Situación y lectura del modelo (español, 2–4 frases). */
  synthetic_findings: z.string(),
  /** 2 pares de alta calidad: ángulo + consulta realista para la red. */
  evidence_queries: z
    .array(evidenceQuerySchema)
    .optional()
    .transform(arr => arr?.slice(0, 2)),
})

/** X, Instagram, TikTok (IA) + YouTube (señal alineada con resultados de la API de datos). */
const aiSocialSearchSchema = z.object({
  youtube: aiPlatformEstimateSchema.optional(),
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

type ClientAiSocialSearch = Partial<Record<SocialEvidencePlatform, AiSocialPlatformOutput>>

export type SocialValidationResult = Omit<z.infer<typeof socialSchema>, 'ai_social_search'> & {
  /** Tras `normalizeAiSocialForClient`: enlaces de búsqueda reales por red. */
  ai_social_search?: ClientAiSocialSearch
  youtube_long_samples?: YoutubeVideoSample[]
  youtube_shorts_samples?: YoutubeVideoSample[]
  /** Para enlaces “buscar en red” desde la UI. */
  explore_query?: string
}
export type AiSocialSearchResult = z.infer<typeof aiSocialSearchSchema>

export type AiSocialPlatformOutput = {
  signal: number
  synthetic_findings: string
  evidence_refs: { title: string; url: string }[]
}

const PLATFORM_LABEL: Record<SocialEvidencePlatform, string> = {
  youtube: 'YouTube',
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

function normalizeAiSocialForClient(
  raw: z.infer<typeof aiSocialSearchSchema> | undefined,
  exploreFallback: string,
): Record<SocialEvidencePlatform, AiSocialPlatformOutput> | undefined {
  if (!raw) return undefined
  const fb = exploreFallback.trim()
  const out: Partial<Record<SocialEvidencePlatform, AiSocialPlatformOutput>> = {}
  const platforms: SocialEvidencePlatform[] = ['youtube', 'x', 'instagram', 'tiktok']
  for (const p of platforms) {
    const block = raw[p]
    if (!block) continue
    const pairs =
      block.evidence_queries
        ?.filter(x => x.label?.trim().length > 0 && x.query?.trim().length > 0)
        .slice(0, 2) ?? []
    let evidence_refs = pairs.map(({ label, query }) => ({
      title: label.trim().slice(0, 200),
      url: buildSocialEvidenceUrl(p, query.trim()),
    }))
    if (evidence_refs.length === 0 && fb.length > 0) {
      evidence_refs = [
        {
          title: `Búsqueda sugerida (${PLATFORM_LABEL[p]})`,
          url: buildSocialEvidenceUrl(p, fb),
        },
      ]
    }
    if (evidence_refs.length === 0) {
      evidence_refs = [
        {
          title: `Explorar ${PLATFORM_LABEL[p]}`,
          url: buildSocialEvidenceUrl(p, ''),
        },
      ]
    }
    out[p] = {
      signal: block.signal,
      synthetic_findings: block.synthetic_findings,
      evidence_refs,
    }
  }
  return Object.keys(out).length > 0 ? (out as Record<SocialEvidencePlatform, AiSocialPlatformOutput>) : undefined
}

function compactExploreFallback(idea: ValidationIdeaInput): string {
  const fromProblem = idea.problem_statement.replace(/\s+/g, ' ').trim().slice(0, 100)
  if (fromProblem.length >= 12) return fromProblem
  return idea.elevator_pitch.replace(/\s+/g, ' ').trim().slice(0, 100)
}

/**
 * Solo APIs gratuitas: YouTube Data API (cuota gratuita con clave).
 * X, Instagram y TikTok: solo inferencia del modelo (sin APIs de pago ni scraping).
 */
export async function validateSocial(idea: ValidationIdeaInput): Promise<SocialValidationResult> {
  const ytLong = await youtubeSearchVideos(idea, { variant: 'any' })
  const longIds = new Set(ytLong.samples.map(s => s.videoId))
  const ytShort = await youtubeSearchVideos(idea, { variant: 'short_form', excludeVideoIds: longIds })

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
        content: `You assess overall social / creator market signal (0-100) for a product idea.

## Datos ya obtenidos de YouTube (solo usa esto para el bloque "youtube" más abajo)
- Vídeos (búsqueda general): ${ytLong.count}. Títulos de muestra: ${JSON.stringify(ytLong.titles)}
- Shorts: ${ytShort.count}. Títulos de muestra: ${JSON.stringify(ytShort.titles)}

## X, Instagram y TikTok (solo inferencia; los enlaces serán búsquedas reales generadas después)
Para cada una de estas tres redes:
1) "synthetic_findings": español, 2-4 frases — discurso (tono, formatos, quejas, nichos) alrededor de ESTA idea.
2) "evidence_queries": exactamente 2 objetos { "label", "query" }:
   - "label": español, muy corto.
   - "query": términos concretos alineados con problema + keywords (sin URLs, sin @inventados). Dos ángulos distintos (ej. dolor vs alternativa).
No inventes enlaces a posts ni IDs.

## Reglas estrictas para ai_social_search.youtube.synthetic_findings (lectura en la app solo de YouTube)
- Español, 2-4 frases.
- Habla ÚNICAMENTE de lo que se desprende de los títulos de muestra de vídeos y Shorts listados arriba (temas, urgencia, dolor, solución, encaje con la idea).
- NO menciones X, Twitter, Instagram, TikTok ni ninguna otra red. NO digas qué habría que buscar en otras redes.
- NO uses palabras como "API", "API real", "Data API", "backend", "servidor", "clave", "cuota" ni jerga técnica.
- NO contradigas el apartado de otras redes: este texto es solo el resumen de YouTube.

## Campo "summary" (visión global, opcional)
- 3-4 frases en español con la lectura global del mercado (puede mencionar brevemente varias fuentes). No repitas el párrafo exclusivo de YouTube palabra por palabra.

Idea: ${idea.elevator_pitch}
Problem: ${idea.problem_statement}
Keywords: ${idea.search_keywords.join(', ')}

Return ONLY JSON:
{
  "score": 0-100,
  "summary": "3-4 sentences in Spanish, holistic market read",
  "youtube_long_count": ${ytLong.count},
  "youtube_shorts_count": ${ytShort.count},
  "ai_social_search": {
    "youtube": {
      "signal": 0-100,
      "synthetic_findings": "Spanish only: YouTube sample titles themes; no other networks; no API words",
      "evidence_queries": [
        { "label": "…", "query": "…" },
        { "label": "…", "query": "…" }
      ]
    },
    "x": {
      "signal": 0-100,
      "synthetic_findings": "Spanish, 2-4 sentences",
      "evidence_queries": [
        { "label": "…", "query": "…" },
        { "label": "…", "query": "…" }
      ]
    },
    "instagram": { "signal": 0-100, "synthetic_findings": "...", "evidence_queries": [ { "label": "…", "query": "…" }, { "label": "…", "query": "…" } ] },
    "tiktok": { "signal": 0-100, "synthetic_findings": "...", "evidence_queries": [ { "label": "…", "query": "…" }, { "label": "…", "query": "…" } ] }
  },
  "channels_researched": ${JSON.stringify(channelsResearched)}
}`,
      },
    ],
    temperature: 0.2,
  })

  const text = completionContentToPlainText(res.choices[0]?.message?.content) || '{}'
  const parsed = socialSchema.safeParse(parseJsonObject(text))
  const explore_query =
    idea.search_keywords
      .map(k => k.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(' ')
      .trim() ||
    compactExploreFallback(idea)

  if (!parsed.success) {
    const base = ytLong.count + ytShort.count > 0 ? 40 : 20
    return {
      score: base,
      summary:
        'No se pudo generar el informe completo de redes. Hay datos de vídeo disponibles; vuelve a ejecutar la validación desde la ficha si quieres un nuevo intento.',
      youtube_long_count: ytLong.count,
      youtube_shorts_count: ytShort.count,
      channels_researched: channelsResearched,
      youtube_long_samples: ytLong.samples,
      youtube_shorts_samples: ytShort.samples,
      explore_query,
    }
  }

  const ai_social_search = normalizeAiSocialForClient(parsed.data.ai_social_search, explore_query)

  return {
    ...parsed.data,
    ai_social_search,
    youtube_long_count: parsed.data.youtube_long_count ?? ytLong.count,
    youtube_shorts_count: parsed.data.youtube_shorts_count ?? ytShort.count,
    channels_researched: parsed.data.channels_researched ?? channelsResearched,
    youtube_long_samples: ytLong.samples,
    youtube_shorts_samples: ytShort.samples,
    explore_query,
  }
}
