import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../src/middleware/errors'
import feedRoutes from '../../src/routes/feed'

const { listPublishedFeedMock } = vi.hoisted(() => ({
  listPublishedFeedMock: vi.fn(),
}))

vi.mock('../../src/services/feed/listPublishedFeed', () => ({
  listPublishedFeed: listPublishedFeedMock,
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  feedListRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
}))

function buildApp() {
  const app = express()
  app.use('/api/feed', feedRoutes)
  app.use(errorHandler)
  return app
}

describe('GET /api/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 422 si limit es invalido', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/feed').query({ limit: '999' })
    expect(res.status).toBe(422)
    expect(listPublishedFeedMock).not.toHaveBeenCalled()
  })

  it('delega en listPublishedFeed y devuelve items', async () => {
    const app = buildApp()
    listPublishedFeedMock.mockResolvedValue({
      items: [
        {
          id: 'i1',
          refinedTitle: 'T',
          elevatorPitch: 'P',
          sector: 'tech',
          validationScore: 50,
          verdict: 'MODERATE_SIGNAL',
          problemStatement: '',
          solution: '',
          targetCustomer: '',
          monetization: '',
          mvpFeature: '',
          distribution: '',
          whyNow: '',
          biggestRisk: '',
          competitors: [],
          validationBreakdown: null,
          isPublished: true,
          publishedAt: '2026-01-01T00:00:00.000Z',
          author: { username: 'u', avatarUrl: null },
          communityVotes: { useful: 0, interesting: 0, notUseful: 0 },
          createdAt: '2026-01-01T00:00:00.000Z',
          status: 'VALIDATED',
          myVote: null,
        },
      ],
      nextCursor: 'next-id',
      nextPage: null,
    })

    const res = await request(app).get('/api/feed').query({ sort: 'new', limit: '10' })

    expect(res.status).toBe(200)
    expect(listPublishedFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        sort: 'new',
        filter: 'all',
      }),
    )
    expect(res.body.items).toHaveLength(1)
    expect(res.body.nextCursor).toBe('next-id')
  })
})
