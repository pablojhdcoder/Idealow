import type { AiSocialSearchPayload, SourceKey } from '@/types/validationStream'

export type ValidationReference = {
  url: string
  title: string
  subtitle?: string
  imageUrl?: string
}

export type YoutubeSample = {
  videoId: string
  title: string
  channelTitle?: string
}

export type CompetitorCard = {
  name: string
  url?: string
  description?: string
  strength?: string
  weakness?: string
}

export type GapAnalysis = {
  gap?: string
  positioning?: string
  advantage?: string
}

export type ParsedDoneExtras = {
  references?: ValidationReference[]
  aiSocialSearch?: AiSocialSearchPayload
  youtubeLongSamples?: YoutubeSample[]
  youtubeShortSamples?: YoutubeSample[]
  /** Conteos del backend (pueden ser >0 aunque falle el parseo de muestras). */
  youtubeLongCount?: number
  youtubeShortsCount?: number
  exploreQuery?: string
  competitors?: CompetitorCard[]
  gapAnalysis?: GapAnalysis
  trendExploreLinks?: { label: string; url: string }[]
  redditSubreddits?: string[]
  bestQuote?: { text: string; url?: string }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

export function parseAiSocialSearch(raw: unknown): AiSocialSearchPayload | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: AiSocialSearchPayload = {}
  for (const key of ['youtube', 'x', 'instagram', 'tiktok'] as const) {
    const p = o[key]
    if (!p || typeof p !== 'object') continue
    const po = p as Record<string, unknown>
    const sig = typeof po.signal === 'number' ? po.signal : Number(po.signal)
    const synthetic_findings =
      typeof po.synthetic_findings === 'string' ? po.synthetic_findings : ''
    if (!Number.isFinite(sig) || !synthetic_findings.trim()) continue
    const evidence_refs: { title: string; url: string }[] = []
    const er = po.evidence_refs
    if (Array.isArray(er)) {
      for (const r of er) {
        const ro = asRecord(r)
        if (!ro || typeof ro.title !== 'string' || typeof ro.url !== 'string') continue
        const title = ro.title.trim()
        const url = ro.url.trim()
        if (!title || !url) continue
        evidence_refs.push({ title: title.slice(0, 220), url })
      }
    }
    out[key] = {
      signal: sig,
      synthetic_findings,
      ...(evidence_refs.length > 0 ? { evidence_refs } : {}),
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function pickYoutubeVideoId(o: Record<string, unknown>): string {
  const direct = o.videoId ?? o.video_id
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  if (typeof direct === 'number' && Number.isFinite(direct)) return String(direct)
  const idObj = asRecord(o.id)
  if (idObj) {
    const nested = idObj.videoId ?? idObj.video_id
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  return ''
}

function parseYoutubeSamples(raw: unknown): YoutubeSample[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: YoutubeSample[] = []
  for (const x of raw) {
    const o = asRecord(x)
    if (!o) continue
    const videoId = pickYoutubeVideoId(o)
    const title = typeof o.title === 'string' ? o.title : ''
    if (!videoId || !title.trim()) continue
    const channelTitle =
      typeof o.channelTitle === 'string'
        ? o.channelTitle
        : typeof o.channel_title === 'string'
          ? o.channel_title
          : undefined
    out.push({ videoId, title, channelTitle })
  }
  return out.length > 0 ? out : undefined
}

/** Enlaces y bloques estructurados cuando `status === 'done'` por fuente. */
export function parseDonePayloadExtras(src: SourceKey, data: Record<string, unknown>): ParsedDoneExtras {
  if (src === 'reddit') {
    const references: ValidationReference[] = []
    const bq = asRecord(data.best_quote)
    const evidence = data.evidence_posts
    if (Array.isArray(evidence)) {
      for (const ep of evidence) {
        const o = asRecord(ep)
        if (!o || typeof o.url !== 'string' || typeof o.title !== 'string') continue
        const sub = typeof o.subreddit === 'string' ? o.subreddit : undefined
        const baseTitle = o.title.length > 100 ? `${o.title.slice(0, 100)}…` : o.title
        const subLabel = sub ? (sub.startsWith('r/') ? sub : `r/${sub}`) : 'Reddit'
        references.push({
          url: o.url,
          title: `${baseTitle} · ${subLabel}`,
        })
      }
    }
    const subreddits = Array.isArray(data.subreddits)
      ? data.subreddits.filter((s): s is string => typeof s === 'string')
      : undefined
    return {
      references: references.length > 0 ? references : undefined,
      redditSubreddits: subreddits,
      bestQuote:
        bq && typeof bq.text === 'string'
          ? { text: bq.text, url: typeof bq.url === 'string' ? bq.url : undefined }
          : undefined,
    }
  }

  if (src === 'news') {
    const references: ValidationReference[] = []
    const hl = data.headline_links
    if (Array.isArray(hl)) {
      for (const x of hl) {
        const o = asRecord(x)
        if (!o || typeof o.title !== 'string') continue
        const url = typeof o.url === 'string' ? o.url : undefined
        if (url) {
          references.push({
            url,
            title: o.title.length > 110 ? `${o.title.slice(0, 110)}…` : o.title,
            subtitle: 'Google News',
          })
        }
      }
    }
    if (references.length === 0) {
      const nr = data.news_references
      if (Array.isArray(nr)) {
        for (const x of nr.slice(0, 5)) {
          const o = asRecord(x)
          if (!o || typeof o.url !== 'string' || typeof o.title !== 'string') continue
          references.push({
            url: o.url,
            title: o.title.length > 110 ? `${o.title.slice(0, 110)}…` : o.title,
            subtitle: 'Google News (RSS)',
          })
        }
      }
    }
    return { references: references.length > 0 ? references : undefined }
  }

  if (src === 'trends') {
    const links: { label: string; url: string }[] = []
    const el = data.explore_links
    if (Array.isArray(el)) {
      for (const x of el) {
        const o = asRecord(x)
        if (!o || typeof o.label !== 'string' || typeof o.url !== 'string') continue
        links.push({ label: o.label, url: o.url })
      }
    }
    return { trendExploreLinks: links.length > 0 ? links : undefined }
  }

  if (src === 'competitors') {
    const competitors: CompetitorCard[] = []
    const raw = data.competitors
    if (Array.isArray(raw)) {
      for (const x of raw) {
        const o = asRecord(x)
        if (!o || typeof o.name !== 'string') continue
        competitors.push({
          name: o.name,
          url: typeof o.url === 'string' ? o.url : undefined,
          description: typeof o.description === 'string' ? o.description : undefined,
          strength: typeof o.strength === 'string' ? o.strength : undefined,
          weakness: typeof o.weakness === 'string' ? o.weakness : undefined,
        })
      }
    }
    const ga = asRecord(data.gap_analysis)
    const gapAnalysis: GapAnalysis | undefined = ga
      ? {
          gap: typeof ga.gap === 'string' ? ga.gap : undefined,
          positioning: typeof ga.positioning === 'string' ? ga.positioning : undefined,
          advantage: typeof ga.advantage === 'string' ? ga.advantage : undefined,
        }
      : undefined
    return {
      competitors: competitors.length > 0 ? competitors : undefined,
      gapAnalysis:
        gapAnalysis && (gapAnalysis.gap || gapAnalysis.positioning || gapAnalysis.advantage)
          ? gapAnalysis
          : undefined,
    }
  }

  if (src === 'social') {
    const aiSocialSearch = parseAiSocialSearch(data.ai_social_search)
    const youtubeLongSamples =
      parseYoutubeSamples(data.youtube_long_samples) ??
      parseYoutubeSamples(data.youtubeLongSamples)
    const youtubeShortSamples =
      parseYoutubeSamples(data.youtube_shorts_samples) ??
      parseYoutubeSamples(data.youtubeShortSamples)
    const exploreQuery = typeof data.explore_query === 'string' ? data.explore_query : undefined
    const youtubeLongCount =
      typeof data.youtube_long_count === 'number' && !Number.isNaN(data.youtube_long_count)
        ? data.youtube_long_count
        : undefined
    const youtubeShortsCount =
      typeof data.youtube_shorts_count === 'number' && !Number.isNaN(data.youtube_shorts_count)
        ? data.youtube_shorts_count
        : undefined
    const out: ParsedDoneExtras = {
      aiSocialSearch,
      exploreQuery,
    }
    if (youtubeLongSamples) out.youtubeLongSamples = youtubeLongSamples
    if (youtubeShortSamples) out.youtubeShortSamples = youtubeShortSamples
    if (youtubeLongCount !== undefined) out.youtubeLongCount = youtubeLongCount
    if (youtubeShortsCount !== undefined) out.youtubeShortsCount = youtubeShortsCount
    return out
  }

  return {}
}
