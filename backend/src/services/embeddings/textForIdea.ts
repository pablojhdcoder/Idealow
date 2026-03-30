import type { Prisma } from '@prisma/client'

const MAX_CHARS = 30_000
const MAX_SEARCH_QUERY_CHARS = 2_000

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
 * Misma plantilla que las ideas indexadas (`title:` + `description:`) para acercar el vector de la consulta al espacio de recuperación.
 */
export function buildEmbeddingTextForSearchQuery(query: string): string {
  const t = query.trim().slice(0, MAX_SEARCH_QUERY_CHARS)
  if (!t) {
    return t
  }
  return [
    'Tipo de documento: idea de startup para recuperación semántica.',
    `title: ${t}`,
    `description: ${t}`,
  ].join('\n')
}

/**
 * Texto estable para embeddings: sin repetir pitch/resumen; sector y campos refinados cuando existen.
 */
export function buildEmbeddingTextForIdea(input: {
  title: string
  summary: string | null
  sector: string | null
  refinedContent: Prisma.JsonValue | null
}): string {
  const root = asRecord(input.refinedContent)
  const refined = root ? asRecord(root.refined as Prisma.JsonValue) : null

  const fromRoot = root ?? {}
  const fromRefined = refined ?? {}

  const title = input.title.trim()
  const summary = (input.summary ?? '').trim()
  const sector = (input.sector ?? '').trim().toLowerCase()

  const problem = pickString(fromRefined, 'problem_statement') || pickString(fromRoot, 'problem')
  const solution = pickString(fromRefined, 'solution') || pickString(fromRoot, 'solution')
  const audience =
    pickString(fromRefined, 'target_customer') ||
    pickString(fromRoot, 'target_audience') ||
    pickString(fromRefined, 'target_audience')
  const pitch =
    pickString(fromRefined, 'elevator_pitch') || pickString(fromRoot, 'elevator_pitch') || summary
  const kw =
    keywordsFrom(fromRefined, 'search_keywords') || keywordsFrom(fromRoot, 'search_keywords')

  const description = summary || pitch
  const extraPitch =
    pitch && summary && pitch !== summary && pitch.trim().length > 0 ? pitch.trim() : ''

  const lines: string[] = [
    'Tipo de documento: idea de startup para recuperación semántica.',
    `title: ${title}`,
  ]

  if (description) {
    lines.push(`description: ${description}`)
  }
  if (extraPitch) {
    lines.push(`elevator_pitch: ${extraPitch}`)
  }
  if (problem) {
    lines.push(`problem: ${problem}`)
  }
  if (solution) {
    lines.push(`solution: ${solution}`)
  }
  if (audience) {
    lines.push(`audience: ${audience}`)
  }
  if (kw) {
    lines.push(`keywords: ${kw}`)
  }
  if (sector) {
    lines.push(`sector: ${sector}`)
  }

  const joined = lines.join('\n').trim()
  if (joined.length <= MAX_CHARS) {
    return joined
  }
  return joined.slice(0, MAX_CHARS)
}
