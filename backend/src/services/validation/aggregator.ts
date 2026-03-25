export type SourceScoreResult = { score?: number | null } | null

export type AggregatedScoreReport = {
  validation_score: number
  verdict: string
  recommendation: string
  breakdown: Record<
    string,
    { score: number | null; weight: number; contribution: number | null }
  >
}

/** Pesos: suman 1.0 — incluye actualidad (news) y social multi-plataforma. */
const WEIGHTS = {
  reddit: 0.22,
  trends: 0.12,
  competitors: 0.22,
  social: 0.26,
  news: 0.18,
} as const

export function aggregateScore(results: Record<string, SourceScoreResult>): AggregatedScoreReport {
  let totalWeight = 0
  let weightedSum = 0

  for (const [source, weight] of Object.entries(WEIGHTS)) {
    const s = results[source]?.score
    if (typeof s === 'number' && !Number.isNaN(s)) {
      weightedSum += s * weight
      totalWeight += weight
    }
  }

  const validation_score =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

  return {
    validation_score,
    verdict: getVerdict(validation_score),
    recommendation: getRecommendation(validation_score),
    breakdown: Object.fromEntries(
      Object.entries(WEIGHTS).map(([source, weight]) => {
        const s = results[source]?.score
        const num = typeof s === 'number' && !Number.isNaN(s) ? s : null
        return [
          source,
          {
            score: num,
            weight,
            contribution: num != null ? Math.round(num * weight) : null,
          },
        ]
      }),
    ),
  }
}

function getVerdict(score: number): string {
  if (score >= 75) return 'STRONG_SIGNAL'
  if (score >= 55) return 'MODERATE_SIGNAL'
  if (score >= 35) return 'WEAK_SIGNAL'
  return 'NO_SIGNAL'
}

function getRecommendation(score: number): string {
  if (score >= 75) return 'Strong market signals. Build the MVP now.'
  if (score >= 55) return 'Moderate signals. Validate further before building.'
  if (score >= 35) return 'Weak signals. Refine the problem or pivot the solution.'
  return 'No clear market signal. Reconsider the problem space.'
}
