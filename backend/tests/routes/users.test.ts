import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STATIC_IDEA_SUGGESTIONS } from '../../src/lib/staticSuggestions'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import usersRoutes from '../../src/routes/users'

const prismaUserFindUnique = vi.hoisted(() => vi.fn())
const prismaUserUpdate = vi.hoisted(() => vi.fn())
const prismaFileFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => prismaUserFindUnique(...args),
      update: (...args: unknown[]) => prismaUserUpdate(...args),
    },
    file: {
      findFirst: (...args: unknown[]) => prismaFileFindFirst(...args),
    },
  },
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  suggestionsRateLimit: (_req: unknown, _res: unknown, next: (e?: unknown) => void) => next(),
}))

vi.mock('../../src/services/users/avatarFile', () => ({
  deleteOwnedAvatarFile: vi.fn().mockResolvedValue(undefined),
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

describe('PATCH /api/users/profile', () => {
  const fileUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

  beforeEach(() => {
    vi.clearAllMocks()
    prismaUserFindUnique.mockResolvedValue({ avatarUrl: null })
  })

  it('actualiza avatarUrl cuando se envia una URL valida', async () => {
    const app = buildApp()
    prismaUserUpdate.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'tester',
      avatarUrl: 'https://example.com/avatar.png',
      sectors: ['tech'],
      goal: 'STARTUP',
      experienceLevel: 'INTERMEDIATE',
    })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarUrl: 'https://example.com/avatar.png' })

    expect(res.status).toBe(200)
    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { avatarUrl: 'https://example.com/avatar.png' },
      }),
    )
    expect(res.body.user.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('limpia avatarUrl cuando se envia string vacio', async () => {
    const app = buildApp()
    prismaUserUpdate.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'tester',
      avatarUrl: null,
      sectors: ['tech'],
      goal: 'STARTUP',
      experienceLevel: 'INTERMEDIATE',
    })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarUrl: '' })

    expect(res.status).toBe(200)
    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { avatarUrl: null },
      }),
    )
    expect(res.body.user.avatarUrl).toBeNull()
  })

  it('asigna avatar desde fichero subido (avatarFileId)', async () => {
    const app = buildApp()
    prismaFileFindFirst.mockResolvedValue({
      id: fileUuid,
      userId: 'user-1',
      mimeType: 'image/png',
      filepath: '/tmp/x',
    })
    prismaUserUpdate.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'tester',
      avatarUrl: `/api/files/${fileUuid}`,
      sectors: ['tech'],
      goal: 'STARTUP',
      experienceLevel: 'INTERMEDIATE',
    })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarFileId: fileUuid })

    expect(res.status).toBe(200)
    expect(prismaFileFindFirst).toHaveBeenCalledWith({
      where: { id: fileUuid, userId: 'user-1' },
    })
    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { avatarUrl: `/api/files/${fileUuid}` },
      }),
    )
    expect(res.body.user.avatarUrl).toBe(`/api/files/${fileUuid}`)
  })

  it('rechaza avatarFileId si el fichero no es imagen', async () => {
    const app = buildApp()
    prismaFileFindFirst.mockResolvedValue({
      id: fileUuid,
      userId: 'user-1',
      mimeType: 'application/pdf',
      filepath: '/tmp/x',
    })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarFileId: fileUuid })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('USERS_AVATAR_FILE_INVALID')
    expect(prismaUserUpdate).not.toHaveBeenCalled()
  })
})
