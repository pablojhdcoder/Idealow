import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STATIC_IDEA_SUGGESTIONS } from '../../src/lib/staticSuggestions'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import usersRoutes from '../../src/routes/users'

const prismaUserFindUnique = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => prismaUserFindUnique(...args),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  suggestionsRateLimit: (_req: unknown, _res: unknown, next: (e?: unknown) => void) => next(),
}))

function signTestToken(userId: string) {
  return signToken(userId)
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/users', usersRoutes)
  app.use(errorHandler)
  return app
}

describe('GET /api/users/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve sugerencias estáticas sin llamar a IA (200 con lista fija)', async () => {
    const app = buildApp()
    prismaUserFindUnique.mockResolvedValue({ id: 'user-1' })

    const res = await request(app)
      .get('/api/users/suggestions')
      .set('Cookie', [`token=${signTestToken('user-1')}`])

    expect(res.status).toBe(200)
    expect(res.body.suggestions).toEqual([...STATIC_IDEA_SUGGESTIONS])
    expect(prismaUserFindUnique).toHaveBeenCalled()
  })

  it('devuelve 401 sin cookie', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/users/suggestions')
    expect(res.status).toBe(401)
  })
})
