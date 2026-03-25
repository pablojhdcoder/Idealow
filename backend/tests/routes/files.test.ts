import cookieParser from 'cookie-parser'
import express from 'express'
import os from 'os'
import path from 'path'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import filesRoutes from '../../src/routes/files'

const { prismaCreateMock } = vi.hoisted(() => ({
  prismaCreateMock: vi.fn(),
}))

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    file: {
      create: prismaCreateMock,
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
