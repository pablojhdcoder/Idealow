import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../src/lib/httpError'
import { updateIdeaPublishState } from '../../../src/services/ideas/updateIdeaPublish'

const { prismaIdeaFindFirstMock, prismaIdeaUpdateMock } = vi.hoisted(() => ({
  prismaIdeaFindFirstMock: vi.fn(),
  prismaIdeaUpdateMock: vi.fn(),
}))

const { scheduleIdeaEmbeddingMock } = vi.hoisted(() => ({
  scheduleIdeaEmbeddingMock: vi.fn(),
}))

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    idea: {
      findFirst: prismaIdeaFindFirstMock,
      update: prismaIdeaUpdateMock,
    },
  },
}))

vi.mock('../../../src/services/embeddings/embeddingJob', () => ({
  scheduleIdeaEmbedding: scheduleIdeaEmbeddingMock,
}))

describe('updateIdeaPublishState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no reescribe publishedAt cuando ya estaba publicada', async () => {
    const publishedAt = new Date('2026-03-20T12:00:00.000Z')
    prismaIdeaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      status: 'VALIDATED',
      isPublished: true,
      publishedAt,
    })

    const result = await updateIdeaPublishState('user-1', 'idea-1', true)

    expect(prismaIdeaUpdateMock).not.toHaveBeenCalled()
    expect(scheduleIdeaEmbeddingMock).not.toHaveBeenCalled()
    expect(result).toEqual({ id: 'idea-1', isPublished: true, publishedAt })
  })

  it('publica idea validada y guarda publishedAt', async () => {
    prismaIdeaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      status: 'VALIDATED',
      isPublished: false,
      publishedAt: null,
    })
    prismaIdeaUpdateMock.mockResolvedValue({
      id: 'idea-1',
      isPublished: true,
      publishedAt: new Date('2026-03-26T10:00:00.000Z'),
    })

    const result = await updateIdeaPublishState('user-1', 'idea-1', true)

    expect(prismaIdeaUpdateMock).toHaveBeenCalled()
    expect(scheduleIdeaEmbeddingMock).toHaveBeenCalledWith('idea-1')
    expect(result.isPublished).toBe(true)
    expect(result.publishedAt).not.toBeNull()
  })

  it('rechaza publicar ideas no validadas', async () => {
    prismaIdeaFindFirstMock.mockResolvedValue({
      id: 'idea-1',
      status: 'DRAFT',
      isPublished: false,
      publishedAt: null,
    })

    await expect(updateIdeaPublishState('user-1', 'idea-1', true)).rejects.toMatchObject<HttpError>({
      statusCode: 400,
      code: 'IDEAS_PUBLISH_NOT_VALIDATED',
    })
  })
})
