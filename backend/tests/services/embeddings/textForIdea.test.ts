import { describe, expect, it } from 'vitest'
import {
  buildEmbeddingTextForIdea,
  buildEmbeddingTextForSearchQuery,
} from '../../../src/services/embeddings/textForIdea'

describe('buildEmbeddingTextForSearchQuery', () => {
  it('replica la plantilla de ideas (title + description) para alinear embeddings', () => {
    const text = buildEmbeddingTextForSearchQuery('  fintech pagos  ')
    expect(text).toContain('title: fintech pagos')
    expect(text).toContain('description: fintech pagos')
    expect(text).toContain('Document type: startup idea for semantic retrieval.')
  })
})

describe('buildEmbeddingTextForIdea', () => {
  it('incluye título, descripción y keywords sin duplicar pitch idéntico al resumen', () => {
    const text = buildEmbeddingTextForIdea({
      title: 'Mi app',
      summary: 'Pitch corto',
      sector: 'tech',
      refinedContent: {
        problem: 'P',
        solution: 'S',
        target_audience: 'Devs',
        elevator_pitch: 'Pitch corto',
        search_keywords: ['saas', 'api'],
      },
    })
    expect(text).toContain('title: Mi app')
    expect(text).toContain('description: Pitch corto')
    expect(text).toContain('keywords: saas, api')
    expect(text).toContain('sector: tech')
    expect(text).not.toMatch(/elevator_pitch:/)
  })

  it('prioriza bloque refined cuando existe', () => {
    const text = buildEmbeddingTextForIdea({
      title: 'T',
      summary: null,
      sector: null,
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
    expect(text).toContain('description: Nuevo pitch')
  })
})
