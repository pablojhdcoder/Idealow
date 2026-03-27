import { describe, expect, it } from 'vitest'
import { buildEmbeddingTextForIdea } from '../../../src/services/embeddings/textForIdea'

describe('buildEmbeddingTextForIdea', () => {
  it('concatena título, resumen y campos del extractor', () => {
    const text = buildEmbeddingTextForIdea({
      title: 'Mi app',
      summary: 'Pitch corto',
      refinedContent: {
        problem: 'P',
        solution: 'S',
        target_audience: 'Devs',
        elevator_pitch: 'Pitch largo',
        search_keywords: ['saas', 'api'],
      },
    })
    expect(text).toContain('title: Mi app')
    expect(text).toContain('summary: Pitch corto')
    expect(text).toContain('keywords: saas, api')
  })

  it('prioriza bloque refined cuando existe', () => {
    const text = buildEmbeddingTextForIdea({
      title: 'T',
      summary: null,
      refinedContent: {
        problem: 'old',
        refined: {
          problem_statement: 'Nuevo problema',
          elevator_pitch: 'Nuevo pitch',
          search_keywords: ['x'],
        },
      },
    })
    expect(text).toContain('problem: Nuevo problema')
    expect(text).toContain('pitch: Nuevo pitch')
  })
})
