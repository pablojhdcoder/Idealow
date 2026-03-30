import { describe, expect, it } from 'vitest'
import { parseRefinedFromRefinedContent } from '@/lib/refinedIdeaPayload'

const minimalRefined = {
  refined_title: 'Título',
  elevator_pitch: 'Pitch',
  problem_statement: 'P',
  solution: 'S',
  target_customer: 'C',
  monetization: 'M',
  mvp_feature: 'V',
  distribution: 'D',
  why_now: 'N',
  biggest_risk: 'R',
  search_keywords: ['a', 'b', 'c'],
}

describe('parseRefinedFromRefinedContent', () => {
  it('extrae el bloque refined', () => {
    expect(parseRefinedFromRefinedContent({ refined: minimalRefined })).toEqual(minimalRefined)
  })

  it('devuelve null si falta refined', () => {
    expect(parseRefinedFromRefinedContent({ title: 'x' })).toBeNull()
  })

  it('devuelve null si hay menos de 3 keywords', () => {
    expect(
      parseRefinedFromRefinedContent({
        refined: { ...minimalRefined, search_keywords: ['a', 'b'] },
      }),
    ).toBeNull()
  })
})
