import { describe, expect, it } from 'vitest'
import { mapIdeaRowToFlashcard } from '../../../src/services/ideas/ideaFlashcard'

describe('mapIdeaRowToFlashcard', () => {
  const base = {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Raw title',
    summary: 'Summary line',
    sector: 'tech',
    status: 'VALIDATED',
    refinedContent: {
      refined: {
        refined_title: 'Refined title',
        elevator_pitch: 'Pitch one line',
        problem_statement: 'Problem text',
        solution: 'Solution text',
        target_customer: 'SMB owners',
        monetization: 'SaaS',
        mvp_feature: 'Dashboard',
        distribution: 'SEO',
        why_now: 'AI wave',
        biggest_risk: 'Adoption',
      },
    },
    validationScore: 80,
    validationData: {
      verdict: 'STRONG_SIGNAL',
      breakdown: {
        reddit: { score: 70, weight: 0.22, contribution: 15 },
      },
    },
    competitors: [{ name: 'CompA', url: 'https://a.test' }],
    isPublished: true,
    publishedAt: new Date('2026-01-01T12:00:00.000Z'),
    createdAt: new Date('2026-01-02T12:00:00.000Z'),
    user: { username: 'alice', avatarUrl: null as string | null },
  }

  it('mapea refined, veredicto, competidores y votos', () => {
    const f = mapIdeaRowToFlashcard(
      base,
      { useful: 2, interesting: 1, notUseful: 0 },
      'INTERESTING',
    )
    expect(f.refinedTitle).toBe('Refined title')
    expect(f.elevatorPitch).toBe('Pitch one line')
    expect(f.verdict).toBe('STRONG_SIGNAL')
    expect(f.validationScore).toBe(80)
    expect(f.competitors[0]?.name).toBe('CompA')
    expect(f.validationBreakdown?.reddit?.score).toBe(70)
    expect(f.communityVotes).toEqual({ useful: 2, interesting: 1, notUseful: 0 })
    expect(f.myVote).toBe('INTERESTING')
    expect(f.author.username).toBe('alice')
  })

  it('infiere veredicto desde score si falta en validationData', () => {
    const f = mapIdeaRowToFlashcard(
      { ...base, validationData: null, validationScore: 40 },
      { useful: 0, interesting: 0, notUseful: 0 },
      null,
    )
    expect(f.verdict).toBe('WEAK_SIGNAL')
  })
})
