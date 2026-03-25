import { describe, expect, it } from 'vitest'
import { STATIC_IDEA_SUGGESTIONS } from '../../src/lib/staticSuggestions'

describe('STATIC_IDEA_SUGGESTIONS', () => {
  it('tiene varias sugerencias no vacías (sin depender de IA)', () => {
    expect(STATIC_IDEA_SUGGESTIONS.length).toBe(9)
    for (const s of STATIC_IDEA_SUGGESTIONS) {
      expect(typeof s).toBe('string')
      expect(s.trim().length).toBeGreaterThan(10)
    }
  })
})
