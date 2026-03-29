import { useEffect, useRef, useState } from 'react'
import { postStartValidation, validationStreamUrl } from '@/lib/api/validation'
import { parseDonePayloadExtras } from '@/lib/parseValidationSsePayload'
import type {
  CompetitorCard,
  GapAnalysis,
  ValidationReference,
  YoutubeSample,
} from '@/lib/parseValidationSsePayload'
import { ApiError } from '@/lib/api/client'
import type { AiSocialSearchPayload, SourceKey } from '@/types/validationStream'

export type {
  AiPlatformEstimate,
  AiSocialSearchPayload,
  SourceKey,
} from '@/types/validationStream'

export type SourceStatus = {
  status: 'idle' | 'searching' | 'done' | 'error'
  score?: number
  summary?: string
  message?: string
  references?: ValidationReference[]
  aiSocialSearch?: AiSocialSearchPayload
  youtubeLongSamples?: YoutubeSample[]
  youtubeShortSamples?: YoutubeSample[]
  youtubeLongCount?: number
  youtubeShortsCount?: number
  exploreQuery?: string
  competitors?: CompetitorCard[]
  gapAnalysis?: GapAnalysis
  trendExploreLinks?: { label: string; url: string }[]
  redditSubreddits?: string[]
  bestQuote?: { text: string; url?: string }
}

export type ValidationStreamState = {
  reddit: SourceStatus
  trends: SourceStatus
  competitors: SourceStatus
  social: SourceStatus
  news: SourceStatus
  complete: boolean
  finalScore: number | null
  verdict: string | null
  recommendation: string | null
  streamError: string | null
  startError: string | null
}

const initialSources: Record<SourceKey, SourceStatus> = {
  reddit: { status: 'idle' },
  trends: { status: 'idle' },
  competitors: { status: 'idle' },
  social: { status: 'idle' },
  news: { status: 'idle' },
}

function isSourceKey(s: string): s is SourceKey {
  return (
    s === 'reddit' ||
    s === 'trends' ||
    s === 'competitors' ||
    s === 'social' ||
    s === 'news'
  )
}

type SsePayload = Record<string, unknown>

export function useValidationStream(ideaId: string | null, enabled: boolean) {
  const [state, setState] = useState<ValidationStreamState>({
    ...initialSources,
    complete: false,
    finalScore: null,
    verdict: null,
    recommendation: null,
    streamError: null,
    startError: null,
  })

  const startedRef = useRef(false)

  useEffect(() => {
    if (!ideaId || !enabled) {
      startedRef.current = false
      return
    }

    startedRef.current = false
    setState({
      ...initialSources,
      complete: false,
      finalScore: null,
      verdict: null,
      recommendation: null,
      streamError: null,
      startError: null,
    })

    const url = validationStreamUrl(ideaId)
    const es = new EventSource(url, { withCredentials: true })

    const startValidationOnce = () => {
      if (startedRef.current) return
      startedRef.current = true
      void postStartValidation(ideaId).catch((e: unknown) => {
        const msg =
          e instanceof ApiError ? e.message : 'No se pudo iniciar la validación'
        setState(prev => ({ ...prev, startError: msg }))
        es.close()
      })
    }

    es.onmessage = (event: MessageEvent<string>) => {
      let data: SsePayload
      try {
        data = JSON.parse(event.data) as SsePayload
      } catch {
        return
      }

      if (data.type === 'ready') {
        startValidationOnce()
        return
      }

      if (data.type === 'complete') {
        setState(prev => ({
          ...prev,
          complete: true,
          finalScore: typeof data.validation_score === 'number' ? data.validation_score : null,
          verdict: typeof data.verdict === 'string' ? data.verdict : null,
          recommendation:
            typeof data.recommendation === 'string' ? data.recommendation : null,
        }))
        es.close()
        return
      }

      if (data.type === 'error') {
        const msg =
          typeof data.message === 'string' ? data.message : 'Error en validación'
        setState(prev => ({ ...prev, streamError: msg }))
        es.close()
        return
      }

      const src = data.source
      if (typeof src === 'string' && isSourceKey(src)) {
        const st = data.status
        if (st === 'searching') {
          setState(prev => ({ ...prev, [src]: { status: 'searching' } }))
          return
        }
        if (st === 'error') {
          setState(prev => ({
            ...prev,
            [src]: {
              status: 'error',
              message: typeof data.message === 'string' ? data.message : undefined,
            },
          }))
          return
        }
        if (st === 'done') {
          const score = typeof data.score === 'number' ? data.score : undefined
          const summary = typeof data.summary === 'string' ? data.summary : undefined
          const extras = parseDonePayloadExtras(src, data)
          setState(prev => ({
            ...prev,
            [src]: {
              status: 'done',
              score,
              summary,
              ...extras,
            },
          }))
        }
      }
    }

    es.onerror = () => {
      setState(prev =>
        prev.complete || prev.streamError
          ? prev
          : { ...prev, streamError: 'Conexión SSE interrumpida' },
      )
      es.close()
    }

    const fallbackTimer = window.setTimeout(() => {
      startValidationOnce()
    }, 250)

    return () => {
      window.clearTimeout(fallbackTimer)
      es.close()
    }
  }, [ideaId, enabled])

  return state
}
