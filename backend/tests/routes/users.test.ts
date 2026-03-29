import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import bcrypt from 'bcryptjs'
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
    prismaUserFindUnique.mockResolvedValue({
      avatarUrl: null,
      email: 'test@example.com',
      username: 'tester',
    })
  })

  it('rechaza avatarUrl externa (solo /api/files/{uuid} o vacío)', async () => {
    const app = buildApp()

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarUrl: 'https://example.com/avatar.png' })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(prismaUserUpdate).not.toHaveBeenCalled()
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

  it('rechaza avatarUrl si el UUID no es un fichero imagen del usuario', async () => {
    const app = buildApp()
    prismaFileFindFirst.mockResolvedValue(null)

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ avatarUrl: `/api/files/${fileUuid}` })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('USERS_AVATAR_FILE_INVALID')
    expect(prismaFileFindFirst).toHaveBeenCalledWith({
      where: { id: fileUuid, userId: 'user-1' },
    })
    expect(prismaUserUpdate).not.toHaveBeenCalled()
  })

  it('acepta avatarUrl solo cuando el fichero es imagen del propio usuario', async () => {
    const app = buildApp()
    prismaFileFindFirst.mockResolvedValue({
      id: fileUuid,
      userId: 'user-1',
      mimeType: 'image/webp',
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
      .send({ avatarUrl: `/api/files/${fileUuid}` })

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
  })

  it('actualiza username cuando está libre', async () => {
    const app = buildApp()
    prismaUserFindUnique
      .mockResolvedValueOnce({
        avatarUrl: null,
        email: 'test@example.com',
        username: 'tester',
      })
      .mockResolvedValueOnce(null)
    prismaUserUpdate.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'newname',
      avatarUrl: null,
      sectors: ['tech'],
      goal: 'STARTUP',
      experienceLevel: 'INTERMEDIATE',
    })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ username: 'newname' })

    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe('newname')
    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { username: 'newname' },
      }),
    )
  })

  it('409 si el correo ya lo usa otro usuario', async () => {
    const app = buildApp()
    prismaUserFindUnique
      .mockResolvedValueOnce({
        avatarUrl: null,
        email: 'test@example.com',
        username: 'tester',
      })
      .mockResolvedValueOnce({ id: 'other-user' })

    const res = await request(app)
      .patch('/api/users/profile')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ email: 'taken@example.com' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('USERS_EMAIL_TAKEN')
    expect(prismaUserUpdate).not.toHaveBeenCalled()
  })
})

describe('POST /api/users/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('401 sin cookie', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/api/users/password')
      .send({ currentPassword: 'a', newPassword: '12345678' })
    expect(res.status).toBe(401)
  })

  it('401 si la contraseña actual no coincide', async () => {
    const app = buildApp()
    const hash = await bcrypt.hash('correct', 4)
    prismaUserFindUnique.mockResolvedValue({ id: 'user-1', passwordHash: hash })

    const res = await request(app)
      .post('/api/users/password')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ currentPassword: 'wrong', newPassword: 'newpass12' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('USERS_PASSWORD_INCORRECT')
    expect(prismaUserUpdate).not.toHaveBeenCalled()
  })

  it('200 y actualiza passwordHash con contraseña actual válida', async () => {
    const app = buildApp()
    const hash = await bcrypt.hash('oldsecret', 4)
    prismaUserFindUnique.mockResolvedValue({ id: 'user-1', passwordHash: hash })
    prismaUserUpdate.mockResolvedValue({})

    const res = await request(app)
      .post('/api/users/password')
      .set('Cookie', [`token=${signTestToken('user-1')}`])
      .send({ currentPassword: 'oldsecret', newPassword: 'newsecret8' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { passwordHash: expect.any(String) },
      }),
    )
    const newHash = prismaUserUpdate.mock.calls[0][0].data.passwordHash as string
    expect(await bcrypt.compare('newsecret8', newHash)).toBe(true)
  })
})
