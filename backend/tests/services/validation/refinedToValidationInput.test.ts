import { describe, expect, it } from 'vitest'
import { refinedContentToValidationInput } from '../../../src/services/validation/refinedToValidationInput'

describe('refinedContentToValidationInput', () => {
  it('prioriza bloque refined del wizard', () => {
    const input = refinedContentToValidationInput(
      {
        elevator_pitch: 'old',
        problem: 'old problem',
        search_keywords: ['a'],
        refined: {
          elevator_pitch: 'Nueva propuesta',
          problem_statement: 'Dolor concreto',
          search_keywords: ['k1', 'k2'],
        },
      },
      null,
    )
    expect(input?.elevator_pitch).toBe('Nueva propuesta')
    expect(input?.problem_statement).toBe('Dolor concreto')
    expect(input?.search_keywords).toEqual(['k1', 'k2'])
  })

  it('cae al extractor si no hay refined', () => {
    const input = refinedContentToValidationInput(
      {
        elevator_pitch: 'Pitch',
        problem: 'Prob',
        search_keywords: ['x', 'y'],
      },
      'Resumen',
    )
    expect(input?.elevator_pitch).toBe('Pitch')
    expect(input?.problem_statement).toBe('Prob')
  })

  it('devuelve null sin contenido util', () => {
    expect(refinedContentToValidationInput(null, null)).toBeNull()
  })
})
