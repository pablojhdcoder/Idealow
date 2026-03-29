import { parseDonePayloadExtras } from '@/lib/parseValidationSsePayload'
import type { SourceKey } from '@/types/validationStream'
import type { ValidationStreamState } from '@/hooks/useValidationStream'

const SOURCE_KEYS: SourceKey[] = ['reddit', 'news', 'social', 'competitors', 'trends']

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Estado inicial mientras el backend genera la primera validación. */
export function buildPendingValidationState(): ValidationStreamState {
  return {
    reddit: { status: 'idle' },
    trends: { status: 'idle' },
    competitors: { status: 'idle' },
    social: { status: 'idle' },
    news: { status: 'idle' },
    complete: false,
    finalScore: null,
    verdict: null,
    recommendation: null,
    streamError: null,
    startError: null,
  }
}

/**
 * Reconstruye el estado de la UI desde `Idea.validationData` (mismo JSON que al cerrar el agregador).
 */
export function hydrateValidationSnapshot(raw: unknown): ValidationStreamState | null {
  const root = asRecord(raw)
  if (!root) return null

  const vs = root.validation_score
  if (typeof vs !== 'number' || Number.isNaN(vs)) return null
  const finalScore = vs

  const state: ValidationStreamState = {
    reddit: { status: 'idle' },
    trends: { status: 'idle' },
    competitors: { status: 'idle' },
    social: { status: 'idle' },
    news: { status: 'idle' },
    complete: true,
    finalScore,
    verdict: typeof root.verdict === 'string' ? root.verdict : null,
    recommendation: typeof root.recommendation === 'string' ? root.recommendation : null,
    streamError: null,
    startError: null,
  }

  for (const src of SOURCE_KEYS) {
    const payload = root[src]
    const data = asRecord(payload)
    if (!data) continue
    const score = typeof data.score === 'number' ? data.score : undefined
    const summary = typeof data.summary === 'string' ? data.summary : undefined
    const extras = parseDonePayloadExtras(src, data)
    state[src] = {
      status: 'done',
      score,
      summary,
      ...extras,
    }
  }

  return state
}
