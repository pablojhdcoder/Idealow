import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import validationRoutes from '../../src/routes/validation'

const runValidationMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const prismaFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../src/services/validation/runValidation', () => ({
  runValidation: runValidationMock,
}))

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    idea: {
      findFirst: (...args: unknown[]) => prismaFindFirst(...args),
    },
  },
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  ideasValidationRateLimit: (_req: unknown, _res: unknown, next: (e?: unknown) => void) => next(),
  ideasValidationSseRateLimit: (_req: unknown, _res: unknown, next: (e?: unknown) => void) => next(),
}))

vi.mock('../../src/services/validation/sseHub', () => ({
  registerValidationSseClient: vi.fn(
    (_ideaId: string, res: import('express').Response) => {
      if (!res.writableEnded) res.end()
    },
  ),
  unregisterValidationSseClient: vi.fn(),
}))

function signTestToken(userId: string) {
  return signToken(userId)
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/validation', validationRoutes)
  app.use(errorHandler)
  return app
}

describe('POST /api/validation/ideas/:id/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('401 sin token', async () => {
    const app = buildApp()
    const res = await request(app).post('/api/validation/ideas/550e8400-e29b-41d4-a716-446655440000/validate')
    expect(res.status).toBe(401)
    expect(runValidationMock).not.toHaveBeenCalled()
  })

  it('404 si la idea no existe o no es del usuario', async () => {
    prismaFindFirst.mockResolvedValue(null)
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app)
      .post(`/api/validation/ideas/${id}/validate`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('VALIDATION_IDEA_NOT_FOUND')
    expect(runValidationMock).not.toHaveBeenCalled()
  })

  it('400 si la idea sigue en DRAFT', async () => {
    prismaFindFirst.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000', status: 'DRAFT' })
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app)
      .post(`/api/validation/ideas/${id}/validate`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_BAD_STATUS')
    expect(runValidationMock).not.toHaveBeenCalled()
  })

  it('202/200 y dispara runValidation en REFINING', async () => {
    prismaFindFirst.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000', status: 'REFINING' })
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app)
      .post(`/api/validation/ideas/${id}/validate`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'started', ideaId: id })
    expect(runValidationMock).toHaveBeenCalledWith(id, 'user-1')
  })
})

describe('GET /api/validation/ideas/:id/validate/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('401 sin token', async () => {
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app).get(`/api/validation/ideas/${id}/validate/stream`)
    expect(res.status).toBe(401)
  })

  it('404 si la idea no pertenece al usuario', async () => {
    prismaFindFirst.mockResolvedValue(null)
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app)
      .get(`/api/validation/ideas/${id}/validate/stream`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)
    expect(res.status).toBe(404)
  })

  it('200 al abrir el stream si la idea existe (SSE registrado)', async () => {
    prismaFindFirst.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' })
    const app = buildApp()
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const res = await request(app)
      .get(`/api/validation/ideas/${id}/validate/stream`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)
    expect(res.status).toBe(200)
  })
})
