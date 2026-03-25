import { describe, expect, it } from 'vitest'
import { createIdeaSchema } from '../../src/schemas/idea'

describe('createIdeaSchema', () => {
  it('acepta payload con contenido de texto valido', () => {
    // Arrange
    const payload = { content: 'Una idea concreta' }

    // Act
    const result = createIdeaSchema.safeParse(payload)

    // Assert
    expect(result.success).toBe(true)
  })

  it('rechaza payload vacio', () => {
    // Arrange
    const payload = {}

    // Act
    const result = createIdeaSchema.safeParse(payload)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rechaza fileId con formato no UUID', () => {
    // Arrange
    const payload = { fileId: 'archivo-1' }

    // Act
    const result = createIdeaSchema.safeParse(payload)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rechaza cuando se envian mas de 12 fileIds', () => {
    // Arrange
    const payload = {
      fileIds: Array.from({ length: 13 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`),
    }

    // Act
    const result = createIdeaSchema.safeParse(payload)

    // Assert
    expect(result.success).toBe(false)
  })
})
