import { describe, expect, it } from 'vitest'
import { publicFlashcardAbsoluteUrl, publicFlashcardPath } from '@/lib/publicFlashcardUrl'

describe('publicFlashcardPath', () => {
  it('construye la ruta con el id codificado', () => {
    expect(publicFlashcardPath('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '/flashcard/550e8400-e29b-41d4-a716-446655440000',
    )
  })
})

describe('publicFlashcardAbsoluteUrl', () => {
  it('une origen y ruta sin barra duplicada', () => {
    expect(publicFlashcardAbsoluteUrl('https://app.example.com', 'abc')).toBe('https://app.example.com/flashcard/abc')
  })

  it('recorta barra final del origen', () => {
    expect(publicFlashcardAbsoluteUrl('https://app.example.com/', 'abc')).toBe('https://app.example.com/flashcard/abc')
  })
})
