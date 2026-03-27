import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitIdeaFeedback } from '../../../src/services/ideas/feedbackService'

const {
  prismaIdeaFindUniqueMock,
  prismaIdeaFeedbackUpsertMock,
} = vi.hoisted(() => ({
  prismaIdeaFindUniqueMock: vi.fn(),
  prismaIdeaFeedbackUpsertMock: vi.fn(),
}))

vi.mock('../../../src/lib/prisma', () => ({
  prisma: {
    idea: {
      findUnique: prismaIdeaFindUniqueMock,
    },
    ideaFeedback: {
      upsert: prismaIdeaFeedbackUpsertMock,
    },
  },
}))

describe('submitIdeaFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('limpia comentario previo al enviar comentario vacío', async () => {
    prismaIdeaFindUniqueMock.mockResolvedValue({
      id: 'idea-1',
      isPublished: true,
      userId: 'owner-1',
    })
    prismaIdeaFeedbackUpsertMock.mockResolvedValue({})

    await submitIdeaFeedback({
      ideaId: 'idea-1',
      userId: 'user-2',
      vote: 'USEFUL',
      comment: '   ',
    })

    expect(prismaIdeaFeedbackUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          vote: 'USEFUL',
          comment: null,
        },
      }),
    )
  })
})
