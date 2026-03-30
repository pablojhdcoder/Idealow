/** Alineado con `RefinedIdeaPayload` del backend (síntesis / confirmación). */
export type RefinedIdeaFields = {
  refined_title: string
  elevator_pitch: string
  problem_statement: string
  solution: string
  target_customer: string
  monetization: string
  mvp_feature: string
  distribution: string
  why_now: string
  biggest_risk: string
  search_keywords: string[]
}

const STRING_KEYS: (keyof Omit<RefinedIdeaFields, 'search_keywords'>)[] = [
  'refined_title',
  'elevator_pitch',
  'problem_statement',
  'solution',
  'target_customer',
  'monetization',
  'mvp_feature',
  'distribution',
  'why_now',
  'biggest_risk',
]

export function parseRefinedFromRefinedContent(refinedContent: unknown): RefinedIdeaFields | null {
  if (!refinedContent || typeof refinedContent !== 'object' || Array.isArray(refinedContent)) {
    return null
  }
  const refined = (refinedContent as { refined?: unknown }).refined
  if (!refined || typeof refined !== 'object' || Array.isArray(refined)) {
    return null
  }
  const o = refined as Record<string, unknown>
  for (const k of STRING_KEYS) {
    if (typeof o[k] !== 'string') {
      return null
    }
  }
  if (!Array.isArray(o.search_keywords)) {
    return null
  }
  const keywords = o.search_keywords.filter((x): x is string => typeof x === 'string')
  if (keywords.length < 3) {
    return null
  }
  return {
    refined_title: o.refined_title as string,
    elevator_pitch: o.elevator_pitch as string,
    problem_statement: o.problem_statement as string,
    solution: o.solution as string,
    target_customer: o.target_customer as string,
    monetization: o.monetization as string,
    mvp_feature: o.mvp_feature as string,
    distribution: o.distribution as string,
    why_now: o.why_now as string,
    biggest_risk: o.biggest_risk as string,
    search_keywords: keywords,
  }
}

export const REFINED_IDEA_FIELD_META: {
  key: keyof Omit<RefinedIdeaFields, 'search_keywords'>
  label: string
  hint?: string
}[] = [
  { key: 'refined_title', label: 'Título' },
  { key: 'elevator_pitch', label: 'Pitch en una frase' },
  { key: 'problem_statement', label: 'Problema' },
  { key: 'solution', label: 'Solución' },
  { key: 'target_customer', label: 'Cliente objetivo' },
  { key: 'monetization', label: 'Monetización' },
  { key: 'mvp_feature', label: 'Funcionalidad clave del MVP' },
  { key: 'distribution', label: 'Distribución' },
  { key: 'why_now', label: 'Por qué ahora' },
  { key: 'biggest_risk', label: 'Mayor riesgo' },
]
