import { describe, expect, it } from 'vitest'
import { aggregateScore } from '../../../src/services/validation/aggregator'

describe('aggregateScore', () => {
  it('pondera fuentes según pesos y redondea', () => {
    const r = aggregateScore({
      reddit: { score: 100 },
      trends: { score: 50 },
      competitors: { score: 0 },
      social: { score: 100 },
      news: { score: 50 },
    })
    expect(r.validation_score).toBe(63)
    expect(r.verdict).toBe('MODERATE_SIGNAL')
    expect(r.breakdown.reddit?.contribution).toBe(22)
  })

  it('con todas las fuentes null devuelve 0 y NO_SIGNAL', () => {
    const r = aggregateScore({
      reddit: null,
      trends: null,
      competitors: null,
      social: null,
      news: null,
    })
    expect(r.validation_score).toBe(0)
    expect(r.verdict).toBe('NO_SIGNAL')
  })

  it('normaliza veredicto STRONG con score alto', () => {
    const r = aggregateScore({
      reddit: { score: 90 },
      trends: { score: 85 },
      competitors: { score: 88 },
      social: { score: 82 },
      news: { score: 85 },
    })
    expect(r.validation_score).toBeGreaterThanOrEqual(75)
    expect(r.verdict).toBe('STRONG_SIGNAL')
  })
})
