import axios from 'axios'
import type { AxiosError } from 'axios'
import { config } from '../../config'
import { logger } from '../../lib/logger'
import type { ValidationIdeaInput } from './types'

type YoutubeSearchItem = {
  id?: { kind?: string; videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

export type YoutubeVideoSample = {
  videoId: string
  title: string
  channelTitle?: string
}

export type YoutubeSearchVariant = 'any' | 'short_form'

/** Palabras muy frecuentes en español/inglés: sin filtrar, el score de relevancia favorece títulos genéricos virales. */
const RELEVANCE_STOPWORDS = new Set(
  [
    'que',
    'qué',
    'los',
    'las',
    'una',
    'uno',
    'unas',
    'unos',
    'con',
    'por',
    'para',
    'como',
    'más',
    'mas',
    'pero',
    'del',
    'al',
    'el',
    'la',
    'de',
    'en',
    'y',
    'o',
    'a',
    'es',
    'son',
    'ser',
    'sobre',
    'cuando',
    'tiene',
    'tienen',
    'han',
    'hay',
    'sin',
    'muy',
    'ya',
    'dos',
    'también',
    'tambien',
    'fue',
    'sus',
    'les',
    'le',
    'lo',
    'un',
    'se',
    'nos',
    'entre',
    'hasta',
    'desde',
    'eso',
    'esa',
    'ese',
    'tan',
    'tanto',
    'así',
    'asi',
    'aquí',
    'aqui',
    'allí',
    'alli',
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'with',
    'from',
    'that',
    'this',
    'was',
    'has',
    'have',
    'been',
    'were',
    'what',
    'when',
    'your',
    'how',
    'who',
    'can',
    'will',
    'our',
    'out',
    'just',
    'more',
    'some',
    'than',
    'then',
    'them',
    'these',
    'they',
    'into',
    'also',
    'only',
  ].map(w =>
    w
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, ''),
  ),
)

function normWord(w: string): string {
  return w
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function compact(s: string, max: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Varias cadenas de búsqueda a partir del pitch, problema y keywords (evita depender solo de keywords vacíos). */
function buildSearchQueries(idea: ValidationIdeaInput): string[] {
  const kws = idea.search_keywords.map(k => k.trim()).filter(k => k.length > 1)
  const kwLine = compact(kws.join(' '), 90)
  const problem = compact(idea.problem_statement, 110)
  const pitch = compact(idea.elevator_pitch, 90)
  const out: string[] = []
  const seen = new Set<string>()
  const add = (q: string) => {
    const t = compact(q, 120)
    if (t.length < 4) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }

  if (kwLine.length >= 4) add(kwLine)
  if (problem.length >= 14) add(problem)
  if (pitch.length >= 14) add(pitch)
  if (kwLine.length >= 4 && problem.length >= 14) {
    add(compact(`${kwLine.split(/\s+/).slice(0, 4).join(' ')} ${problem.slice(0, 72)}`, 120))
  }
  if (kwLine.length >= 4 && pitch.length >= 14) {
    add(compact(`${kwLine.split(/\s+/).slice(0, 3).join(' ')} ${pitch.slice(0, 68)}`, 120))
  }
  if (out.length === 0) {
    add(problem || pitch || 'startup product')
  }
  return out.slice(0, 5)
}

function youtubeLocaleParams(idea: ValidationIdeaInput): Record<string, string> {
  const blob = `${idea.problem_statement}${idea.elevator_pitch}`
  if (/[áéíóúñü¿¡]/i.test(blob)) {
    return { relevanceLanguage: 'es', regionCode: 'ES' }
  }
  return { relevanceLanguage: 'en', regionCode: 'US' }
}

/** Solapamiento título ↔ idea (misma idea que Reddit: menos ruido en resultados genéricos). */
function titleRelevanceToIdea(idea: ValidationIdeaInput, title: string): number {
  const blob = `${idea.elevator_pitch} ${idea.problem_statement} ${idea.search_keywords.join(' ')}`
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
  const tokenize = (s: string) =>
    norm(s)
      .split(/[\s,.;:/\\()[\]{}'"¿?¡!#]+/)
      .map(w => normWord(w))
      .filter(w => w.length > 2 && !RELEVANCE_STOPWORDS.has(w))
  const ideaTok = new Set(tokenize(blob))
  const titleTok = new Set(tokenize(title))
  if (ideaTok.size === 0) return 0.35
  let overlap = 0
  for (const w of titleTok) {
    if (ideaTok.has(w)) overlap++
  }
  const denom = Math.sqrt(ideaTok.size * Math.max(titleTok.size, 1))
  return denom > 0 ? overlap / denom : 0
}

async function searchYoutubeOnce(
  q: string,
  extraParams: Record<string, string | number | undefined>,
): Promise<YoutubeVideoSample[]> {
  const key = config.youtubeApiKey.trim()
  if (!key || !q.trim()) return []
  try {
    const { data } = await axios.get<{ items?: YoutubeSearchItem[] }>(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          type: 'video',
          maxResults: 12,
          q: q.trim(),
          key,
          order: 'relevance',
          safeSearch: 'moderate',
          ...extraParams,
        },
        timeout: 14000,
      },
    )
    const items = data.items ?? []
    const samples: YoutubeVideoSample[] = []
    for (const i of items) {
      const videoId = i.id?.videoId
      const title = i.snippet?.title
      if (typeof videoId !== 'string' || typeof title !== 'string') continue
      const channelTitle =
        typeof i.snippet?.channelTitle === 'string' ? i.snippet.channelTitle : undefined
      samples.push({ videoId, title, channelTitle })
    }
    return samples
  } catch (e) {
    const ax = e as AxiosError<{ error?: { message?: string } }>
    const apiMsg = ax.response?.data?.error?.message
    logger.warn(
      { err: apiMsg ?? ax.message, q: q.slice(0, 80), status: ax.response?.status },
      'YouTube search request failed',
    )
    return []
  }
}

/**
 * YouTube Data API v3 (`search.list`).
 * Combina varias consultas y deduplica por `videoId`. Shorts: primero `videoDuration=short`, luego fallback con “#shorts”.
 */
export async function youtubeSearchVideos(
  idea: ValidationIdeaInput,
  opts?: { variant?: YoutubeSearchVariant; excludeVideoIds?: Set<string> },
): Promise<{ count: number; titles: string[]; samples: YoutubeVideoSample[] }> {
  const key = config.youtubeApiKey.trim()
  if (!key) {
    return { count: 0, titles: [], samples: [] }
  }

  const variant = opts?.variant ?? 'any'
  const exclude = opts?.excludeVideoIds ?? new Set<string>()
  const queries = buildSearchQueries(idea)
  const base: Record<string, string | number | undefined> = youtubeLocaleParams(idea)

  const merged: YoutubeVideoSample[] = []
  const seen = new Set<string>()

  const pushBatch = (batch: YoutubeVideoSample[]) => {
    for (const s of batch) {
      if (exclude.has(s.videoId) || seen.has(s.videoId)) continue
      seen.add(s.videoId)
      merged.push(s)
    }
  }

  const targetMax = 14

  if (variant === 'short_form') {
    for (const q of queries) {
      if (merged.length >= targetMax) break
      const batch = await searchYoutubeOnce(q, { ...base, videoDuration: 'short' })
      pushBatch(batch)
    }
    if (merged.length < 3) {
      for (const q of queries) {
        if (merged.length >= targetMax) break
        const batch = await searchYoutubeOnce(compact(`${q} #shorts`, 120), base)
        pushBatch(batch)
      }
    }
  } else {
    for (const q of queries) {
      if (merged.length >= targetMax) break
      const batch = await searchYoutubeOnce(q, base)
      pushBatch(batch)
    }
  }

  merged.sort((a, b) => {
    const ra = titleRelevanceToIdea(idea, a.title) * 100 + Math.log1p((a.title?.length ?? 0) / 40)
    const rb = titleRelevanceToIdea(idea, b.title) * 100 + Math.log1p((b.title?.length ?? 0) / 40)
    return rb - ra
  })

  const samples = merged.slice(0, 5)
  return {
    count: samples.length,
    titles: samples.map(s => s.title).slice(0, 5),
    samples,
  }
}
