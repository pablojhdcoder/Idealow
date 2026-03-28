import cookieParser from 'cookie-parser'
import express from 'express'
import fs from 'fs'
import os from 'os'
import path from 'path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../../src/config'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import filesRoutes from '../../src/routes/files'

const { prismaCreateMock, prismaFileFindUnique, prismaUserFindFirst } = vi.hoisted(() => ({
  prismaCreateMock: vi.fn(),
  prismaFileFindUnique: vi.fn(),
  prismaUserFindFirst: vi.fn(),
}))

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    file: {
      create: prismaCreateMock,
      findUnique: (...args: unknown[]) => prismaFileFindUnique(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => prismaUserFindFirst(...args),
    },
  },
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  filesUploadRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
}))

process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(os.tmpdir(), 'idealow2-tests-uploads')

function signTestToken(userId: string) {
  return signToken(userId)
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/files', filesRoutes)
  app.use(errorHandler)
  return app
}

describe('POST /api/files/upload', () => {
  it('retorna 401 sin autenticacion', async () => {
    // Arrange
    const app = buildApp()

    // Act
    const response = await request(app).post('/api/files/upload')

    // Assert
    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' })
  })

  it('rechaza tipo no soportado', async () => {
    // Arrange
    const app = buildApp()
    const token = signTestToken('user-1')

    // Act
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('contenido'), {
        filename: 'archivo.bin',
        contentType: 'application/octet-stream',
      })

    // Assert
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      error: 'Unsupported file type',
      code: 'FILES_UNSUPPORTED_TYPE',
    })
    expect(prismaCreateMock).not.toHaveBeenCalled()
  })

  it('acepta .md aunque el cliente envie application/octet-stream', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    prismaCreateMock.mockResolvedValue({
      id: 'file-md',
      userId: 'user-1',
      filepath: '/tmp/x.md',
      originalName: 'nota.md',
      mimeType: 'application/octet-stream',
      sizeBytes: 4,
      createdAt,
    })

    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('# hi'), {
        filename: 'nota.md',
        contentType: 'application/octet-stream',
      })

    expect(response.status).toBe(200)
    expect(response.body.fileId).toBe('file-md')
    expect(prismaCreateMock).toHaveBeenCalled()
  })

  it('retorna exito sin exponer filepath', async () => {
    // Arrange
    const app = buildApp()
    const token = signTestToken('user-1')
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    prismaCreateMock.mockResolvedValue({
      id: 'file-1',
      userId: 'user-1',
      filepath: '/tmp/secret/path.txt',
      originalName: 'nota.txt',
      mimeType: 'text/plain',
      sizeBytes: 11,
      createdAt,
    })

    // Act
    const response = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hola mundo'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      })

    // Assert
    expect(response.status).toBe(200)
    expect(response.body.fileId).toBe('file-1')
    expect(response.body.file).toEqual({
      id: 'file-1',
      userId: 'user-1',
      originalName: 'nota.txt',
      mimeType: 'text/plain',
      sizeBytes: 11,
      createdAt: createdAt.toISOString(),
    })
    expect(response.body.file.filepath).toBeUndefined()
  })
})

describe('GET /api/files/:id', () => {
  const fileId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  let tmpPath: string

  beforeEach(() => {
    vi.clearAllMocks()
    const uploadRoot = path.resolve(config.uploadDir)
    fs.mkdirSync(uploadRoot, { recursive: true })
    tmpPath = path.join(uploadRoot, `idealow2-file-get-${fileId}.png`)
    fs.writeFileSync(tmpPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })

  afterEach(() => {
    try {
      fs.unlinkSync(tmpPath)
    } catch {
      // ignore
    }
  })

  it('permite al propietario leer el fichero', async () => {
    const app = buildApp()
    prismaFileFindUnique.mockResolvedValue({
      id: fileId,
      userId: 'user-1',
      filepath: tmpPath,
      mimeType: 'image/png',
    })

    const response = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/image\/png/)
    expect(response.body.length).toBeGreaterThan(0)
  })

  it('permite lectura publica si la imagen es avatar de algun usuario', async () => {
    const app = buildApp()
    prismaFileFindUnique.mockResolvedValue({
      id: fileId,
      userId: 'user-2',
      filepath: tmpPath,
      mimeType: 'image/png',
    })
    prismaUserFindFirst.mockResolvedValue({ id: 'user-2' })

    const response = await request(app).get(`/api/files/${fileId}`)

    expect(response.status).toBe(200)
    expect(prismaUserFindFirst).toHaveBeenCalled()
  })

  it('devuelve 403 si no es propietario ni avatar publico', async () => {
    const app = buildApp()
    prismaFileFindUnique.mockResolvedValue({
      id: fileId,
      userId: 'user-2',
      filepath: tmpPath,
      mimeType: 'image/png',
    })
    prismaUserFindFirst.mockResolvedValue(null)

    const response = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${signTestToken('user-1')}`)

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FILES_FORBIDDEN')
  })
})
