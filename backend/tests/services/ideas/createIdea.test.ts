import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../src/lib/httpError'
import { createIdeaFromInput } from '../../../src/services/ideas/createIdea'

const { prismaFileFindFirstMock, prismaIdeaCreateMock } = vi.hoisted(() => ({
  prismaFileFindFirstMock: vi.fn(),
  prismaIdeaCreateMock: vi.fn(),
}))

const { extractIdeaMock } = vi.hoisted(() => ({
  extractIdeaMock: vi.fn(),
}))

const { processMediaMock } = vi.hoisted(() => ({
  processMediaMock: vi.fn(),
}))

const { prismaFileUpdateMock } = vi.hoisted(() => ({
  prismaFileUpdateMock: vi.fn(),
}))

vi.mock('../../../src/services/embeddings/embeddingJob', () => ({
  scheduleIdeaEmbedding: vi.fn(),
  scheduleFileEmbedding: vi.fn(),
}))

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    file: {
      findFirst: prismaFileFindFirstMock,
      update: prismaFileUpdateMock,
    },
    idea: {
      create: prismaIdeaCreateMock,
    },
  },
}))

vi.mock('../../../src/services/ai/extractor', () => ({
  extractIdea: extractIdeaMock,
}))

vi.mock('../../../src/services/media/processor', () => ({
  processMedia: processMediaMock,
  WHISPER_DEPLOYMENT_MISSING: 'WHISPER_DEPLOYMENT_MISSING',
}))

describe('createIdeaFromInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFileUpdateMock.mockResolvedValue({})
  })

  it('combina contenido y archivos del usuario y persiste idea', async () => {
    // Arrange
    prismaFileFindFirstMock.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'user-1',
      ideaId: null,
      filepath: '/tmp/file.txt',
      mimeType: 'text/plain',
    })
    processMediaMock.mockResolvedValue('texto desde archivo')
    extractIdeaMock.mockResolvedValue({
      title: 'Idea final',
      problem: 'Problema',
      solution: 'Solucion',
      target_audience: 'Audiencia',
      sector: 'tech',
      elevator_pitch: 'Pitch',
      confidence: 0.9,
      search_keywords: ['idea'],
    })
    prismaIdeaCreateMock.mockResolvedValue({ id: 'idea-1' })

    // Act
    const result = await createIdeaFromInput({
      userId: 'user-1',
      content: '  texto manual  ',
      fileIds: ['00000000-0000-4000-8000-000000000001'],
      sector: 'tech',
    })

    // Assert
    expect(prismaFileFindFirstMock).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000001', userId: 'user-1' },
    })
    expect(processMediaMock).toHaveBeenCalledWith('/tmp/file.txt', 'text/plain')
    expect(extractIdeaMock).toHaveBeenCalledWith('texto manual\n\ntexto desde archivo', 'tech')
    expect(prismaIdeaCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        title: 'Idea final',
        rawContent: 'texto manual\n\ntexto desde archivo',
        isPublished: true,
        refinedContent: expect.objectContaining({
          title: 'Idea final',
          problem: 'Problema',
          solution: 'Solucion',
        }),
      }),
    })
    expect(result).toEqual({
      ideaId: 'idea-1',
      extracted: expect.objectContaining({ title: 'Idea final' }),
      nextStep: 'refine',
    })
  })

  it('retorna 409 cuando el archivo ya está vinculado a otra idea', async () => {
    prismaFileFindFirstMock.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'user-1',
      ideaId: 'idea-previa',
      filepath: '/tmp/file.txt',
      mimeType: 'text/plain',
    })

    const action = createIdeaFromInput({
      userId: 'user-1',
      content: 'texto',
      fileIds: ['00000000-0000-4000-8000-000000000001'],
    })

    await expect(action).rejects.toBeInstanceOf(HttpError)
    await expect(action).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEAS_FILE_ALREADY_ATTACHED',
    })
    expect(processMediaMock).not.toHaveBeenCalled()
  })

  it('retorna 404 cuando un archivo no pertenece al usuario', async () => {
    // Arrange
    prismaFileFindFirstMock.mockResolvedValue(null)

    // Act
    const action = createIdeaFromInput({
      userId: 'user-1',
      fileIds: ['00000000-0000-4000-8000-000000000999'],
    })

    // Assert
    await expect(action).rejects.toBeInstanceOf(HttpError)
    await expect(action).rejects.toMatchObject({ statusCode: 404, message: 'File not found' })
  })

  it('mapea errores de media no soportada a 422', async () => {
    // Arrange
    prismaFileFindFirstMock.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'user-1',
      ideaId: null,
      filepath: '/tmp/file.pdf',
      mimeType: 'application/pdf',
    })
    processMediaMock.mockRejectedValue(new Error('UNSUPPORTED_MEDIA: PDF extraction is not implemented yet'))

    // Act
    const action = createIdeaFromInput({
      userId: 'user-1',
      fileIds: ['00000000-0000-4000-8000-000000000001'],
    })

    // Assert
    await expect(action).rejects.toBeInstanceOf(HttpError)
    await expect(action).rejects.toMatchObject({
      statusCode: 422,
      message: 'PDF extraction is not implemented yet',
    })
  })

  it('procesa correctamente archivos PDF para extraer idea', async () => {
    // Arrange
    prismaFileFindFirstMock.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000111',
      userId: 'user-1',
      ideaId: null,
      filepath: '/tmp/idea.pdf',
      mimeType: 'application/pdf',
    })
    processMediaMock.mockResolvedValue('contenido extraido del pdf')
    extractIdeaMock.mockResolvedValue({
      title: 'Idea desde PDF',
      problem: 'Problema',
      solution: 'Solucion',
      target_audience: 'Audiencia',
      sector: 'education',
      elevator_pitch: 'Pitch',
      confidence: 0.92,
      search_keywords: ['pdf', 'idea'],
    })
    prismaIdeaCreateMock.mockResolvedValue({ id: 'idea-pdf-1' })

    // Act
    const result = await createIdeaFromInput({
      userId: 'user-1',
      fileIds: ['00000000-0000-4000-8000-000000000111'],
      sector: 'education',
    })

    // Assert
    expect(processMediaMock).toHaveBeenCalledWith('/tmp/idea.pdf', 'application/pdf')
    expect(extractIdeaMock).toHaveBeenCalledWith('contenido extraido del pdf', 'education')
    expect(result.ideaId).toBe('idea-pdf-1')
    expect(result.extracted.title).toBe('Idea desde PDF')
  })

  it('persiste isPublished false cuando el cliente lo pide', async () => {
    prismaFileFindFirstMock.mockResolvedValue(null)
    extractIdeaMock.mockResolvedValue({
      title: 'Privada',
      problem: 'P',
      solution: 'S',
      target_audience: 'A',
      sector: 'tech',
      elevator_pitch: 'Pitch',
      confidence: 0.9,
      search_keywords: ['x'],
    })
    prismaIdeaCreateMock.mockResolvedValue({ id: 'idea-private' })

    await createIdeaFromInput({
      userId: 'user-1',
      content: 'texto',
      isPublished: false,
    })

    expect(prismaIdeaCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isPublished: false,
      }),
    })
  })

  it('retorna 503 cuando falta deployment de Whisper para audio', async () => {
    prismaFileFindFirstMock.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'user-1',
      ideaId: null,
      filepath: '/tmp/audio.mp3',
      mimeType: 'audio/mpeg',
    })
    processMediaMock.mockRejectedValue(new Error('WHISPER_DEPLOYMENT_MISSING'))

    const action = createIdeaFromInput({
      userId: 'user-1',
      fileIds: ['00000000-0000-4000-8000-000000000001'],
    })

    await expect(action).rejects.toBeInstanceOf(HttpError)
    await expect(action).rejects.toMatchObject({
      statusCode: 503,
      code: 'IDEAS_WHISPER_NOT_CONFIGURED',
    })
  })

  it('retorna 422 cuando no hay contenido util', async () => {
    // Arrange
    // sin contenido y sin archivos validos

    // Act
    const action = createIdeaFromInput({
      userId: 'user-1',
      content: '   ',
    })

    // Assert
    await expect(action).rejects.toBeInstanceOf(HttpError)
    await expect(action).rejects.toMatchObject({ statusCode: 422, message: 'No content provided' })
  })
})
