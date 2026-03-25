import { describe, expect, it, vi } from 'vitest'

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}))

const { getTextMock, destroyMock, PDFParseMock } = vi.hoisted(() => ({
  getTextMock: vi.fn(),
  destroyMock: vi.fn(),
  PDFParseMock: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    readFile: readFileMock,
  },
}))

vi.mock('pdf-parse', () => ({
  PDFParse: PDFParseMock,
}))

describe('processMedia - PDF support', () => {
  it('extrae texto de archivos PDF locales', async () => {
    // Arrange
    readFileMock.mockResolvedValue(Buffer.from('fake-pdf'))
    getTextMock.mockResolvedValue({ text: '  Texto   extraido \n de PDF  ' })
    destroyMock.mockResolvedValue(undefined)
    PDFParseMock.mockImplementation(function PDFParseCtor() {
      return {
        getText: getTextMock,
        destroy: destroyMock,
      }
    })
    const { processMedia } = await import('../../../src/services/media/processor')

    // Act
    const result = await processMedia('/tmp/idea.pdf', 'application/pdf')

    // Assert
    expect(readFileMock).toHaveBeenCalledWith('/tmp/idea.pdf')
    expect(PDFParseMock).toHaveBeenCalledTimes(1)
    expect(getTextMock).toHaveBeenCalledTimes(1)
    expect(destroyMock).toHaveBeenCalledTimes(1)
    expect(result).toBe('Texto extraido de PDF')
  })
})

