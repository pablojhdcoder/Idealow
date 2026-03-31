import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import { ideasValidationSseRateLimit } from '../../src/middleware/rateLimit'
import validationRoutes from '../../src/routes/validation'

const prismaFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    idea: {
      findFirst: (...args: unknown[]) => prismaFindFirst(...args),
    },
  },
}))

vi.mock('../../src/services/validation/sseHub', () => ({
  registerValidationSseClient: vi.fn((_id: string, res: import('express').Response) => {
    if (!res.writableEnded) res.end()
  }),
  unregisterValidationSseClient: vi.fn(),
}))

vi.mock('../../src/services/validation/runValidation', () => ({
  runValidation: vi.fn(),
}))

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/validation', validationRoutes)
  app.use(errorHandler)
  return app
}

describe('GET /api/validation/ideas/:id/validate/stream — rate limit SSE', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(async () => {
    vi.clearAllMocks()
    prismaFindFirst.mockResolvedValue({ id })
    await ideasValidationSseRateLimit.resetKey('user:user-1')
  })

  it('devuelve 429 tras superar el máximo de aperturas SSE por ventana', async () => {
    const app = buildApp()
    const auth = `Bearer ${signToken('user-1')}`

    for (let i = 0; i < 40; i++) {
      const res = await request(app)
        .get(`/api/validation/ideas/${id}/validate/stream`)
        .set('Authorization', auth)
      expect(res.status).toBe(200)
    }

    const blocked = await request(app)
      .get(`/api/validation/ideas/${id}/validate/stream`)
      .set('Authorization', auth)
    expect(blocked.status).toBe(429)
    expect(blocked.body.code).toBe('RATE_LIMIT_IDEAS_VALIDATION_SSE')
  })
})
