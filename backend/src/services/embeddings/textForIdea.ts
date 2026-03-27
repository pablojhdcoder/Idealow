import type { Prisma } from '@prisma/client'

const MAX_CHARS = 30_000

function asRecord(v: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return null
}

function pickString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key]
  return typeof v === 'string' ? v.trim() : ''
}

function keywordsFrom(obj: Record<string, unknown>, key: string): string {
  const v = obj[key]
  if (!Array.isArray(v)) {
    return ''
  }
  const parts = v.filter((x): x is string => typeof x === 'string').map(s => s.trim())
  return parts.slice(0, 16).join(', ')
}

/**
 * Texto estable para embeddings: título, resumen y campos relevantes de refinedContent (orden fijo).
 */
export function buildEmbeddingTextForIdea(input: {
  title: string
  summary: string | null
  refinedContent: Prisma.JsonValue | null
}): string {
  const root = asRecord(input.refinedContent)
  const refined = root ? asRecord(root.refined as Prisma.JsonValue) : null

  const fromRoot = root ?? {}
  const fromRefined = refined ?? {}

  const title = input.title.trim()
  const summary = (input.summary ?? '').trim()

  const problem = pickString(fromRefined, 'problem_statement') || pickString(fromRoot, 'problem')
  const solution = pickString(fromRefined, 'solution') || pickString(fromRoot, 'solution')
  const audience =
    pickString(fromRefined, 'target_customer') ||
    pickString(fromRoot, 'target_audience') ||
    pickString(fromRefined, 'target_audience')
  const pitch =
    pickString(fromRefined, 'elevator_pitch') ||
    pickString(fromRoot, 'elevator_pitch') ||
    summary
  const kw =
    keywordsFrom(fromRefined, 'search_keywords') || keywordsFrom(fromRoot, 'search_keywords')

  const lines = [
    `title: ${title}`,
    `summary: ${summary || pitch}`,
    `pitch: ${pitch}`,
    `problem: ${problem}`,
    `solution: ${solution}`,
    `audience: ${audience}`,
    kw ? `keywords: ${kw}` : '',
  ].filter(Boolean)

  const joined = lines.join('\n').trim()
  if (joined.length <= MAX_CHARS) {
    return joined
  }
  return joined.slice(0, MAX_CHARS)
}
