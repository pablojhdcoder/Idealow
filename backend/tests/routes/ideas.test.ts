import cookieParser from 'cookie-parser'
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '../../src/config'
import { HttpError } from '../../src/lib/httpError'
import { signToken } from '../../src/lib/jwt'
import { errorHandler } from '../../src/middleware/errors'
import ideasRoutes from '../../src/routes/ideas'

const { createIdeaFromInputMock } = vi.hoisted(() => ({
  createIdeaFromInputMock: vi.fn(),
}))
const { listIdeasForUserMock } = vi.hoisted(() => ({
  listIdeasForUserMock: vi.fn(),
}))
const { cleanupOrphanedUploadsMock } = vi.hoisted(() => ({
  cleanupOrphanedUploadsMock: vi.fn(),
}))

const { loadRefinementQuestionsMock, submitRefinementMock } = vi.hoisted(() => ({
  loadRefinementQuestionsMock: vi.fn(),
  submitRefinementMock: vi.fn(),
}))

vi.mock('../../src/services/ideas', () => ({
  createIdeaFromInput: createIdeaFromInputMock,
  listIdeasForUser: listIdeasForUserMock,
}))
vi.mock('../../src/services/ideas/refinement', () => ({
  loadRefinementQuestions: loadRefinementQuestionsMock,
  submitRefinement: submitRefinementMock,
}))
vi.mock('../../src/services/files/cleanupOrphanedUploads', () => ({
  cleanupOrphanedUploads: cleanupOrphanedUploadsMock,
}))

vi.mock('../../src/middleware/rateLimit', () => ({
  ideasCreateRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  ideasRefineRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  semanticExploreRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  ideasPatchRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
  ideasFeedbackPostRateLimit: (_req: unknown, _res: unknown, next: (err?: unknown) => void) => next(),
}))

function signTestToken(userId: string) {
  return signToken(userId)
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/ideas', ideasRoutes)
  app.use(errorHandler)
  return app
}

describe('POST /api/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 en GET sin autenticacion', async () => {
    const app = buildApp()
    const response = await request(app).get('/api/ideas')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' })
  })

  it('retorna ideas del usuario autenticado en GET', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const createdAt = new Date('2026-01-05T00:00:00.000Z')
    listIdeasForUserMock.mockResolvedValue({
      ideas: [
        {
          id: 'idea-1',
          title: 'Idea 1',
          summary: 'Resumen',
          sector: 'tech',
          status: 'DRAFT',
          isPublished: false,
          validationScore: null,
          createdAt,
        },
      ],
      nextCursor: null,
    })

    const response = await request(app).get('/api/ideas').set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(listIdeasForUserMock).toHaveBeenCalledWith('user-1', {})
    expect(response.body).toEqual({
      ideas: [
        {
          id: 'idea-1',
          title: 'Idea 1',
          summary: 'Resumen',
          sector: 'tech',
          status: 'DRAFT',
          isPublished: false,
          validationScore: null,
          createdAt: createdAt.toISOString(),
        },
      ],
      nextCursor: null,
    })
  })

  it('retorna 422 si query de listado es invalida', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')

    const response = await request(app)
      .get('/api/ideas')
      .query({ limit: '99' })
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(listIdeasForUserMock).not.toHaveBeenCalled()
  })

  it('retorna 401 sin autenticacion', async () => {
    const app = buildApp()
    const response = await request(app).post('/api/ideas').send({ content: 'idea' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' })
  })

  it('retorna 401 con token invalido por issuer/audience', async () => {
    const app = buildApp()
    const invalidToken = jwt.sign({ userId: 'user-1' }, config.jwtSecret, {
      expiresIn: '7d',
      algorithm: 'HS256',
      issuer: 'otro-issuer',
      audience: config.jwtAudience,
    })

    const response = await request(app)
      .post('/api/ideas')
      .set('Authorization', `Bearer ${invalidToken}`)
      .send({ content: 'idea valida' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' })
  })

  it('retorna 422 con body invalido (sin contenido ni archivos)', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')

    const response = await request(app).post('/api/ideas').set('Authorization', `Bearer ${token}`).send({})

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('Validation failed')
    expect(response.body.code).toBe('VALIDATION_ERROR')
  })

  it('retorna 201 en caso valido con dependencias mockeadas', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    createIdeaFromInputMock.mockResolvedValue({
      ideaId: 'idea-1',
      extracted: { title: 'Idea test' },
    })

    const response = await request(app)
      .post('/api/ideas')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Una idea valida' })

    expect(response.status).toBe(201)
    expect(createIdeaFromInputMock).toHaveBeenCalledWith({
      userId: 'user-1',
      content: 'Una idea valida',
      fileId: undefined,
      fileIds: undefined,
      sector: undefined,
      isPublished: true,
    })
    expect(response.body).toEqual({
      ideaId: 'idea-1',
      extracted: { title: 'Idea test' },
    })
  })

  it('intenta compensar adjuntos huérfanos cuando falla createIdea', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    createIdeaFromInputMock.mockRejectedValue(
      new HttpError(502, 'Microsoft Foundry / Azure OpenAI error', 'IDEAS_AI_PROVIDER_ERROR'),
    )
    cleanupOrphanedUploadsMock.mockResolvedValue({
      attempted: 2,
      filesystemDeleted: 2,
      dbDeleted: 2,
      filesystemErrors: 0,
    })

    const response = await request(app)
      .post('/api/ideas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'Idea',
        fileId: '00000000-0000-4000-8000-000000000001',
        fileIds: ['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'],
      })

    expect(response.status).toBe(502)
    expect(cleanupOrphanedUploadsMock).toHaveBeenCalledWith({
      userId: 'user-1',
      fileIds: ['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'],
    })
  })

  it('mantiene el error original aunque falle la compensacion', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    createIdeaFromInputMock.mockRejectedValue(
      new HttpError(422, 'No content provided', 'IDEAS_NO_CONTENT'),
    )
    cleanupOrphanedUploadsMock.mockRejectedValue(new Error('fs error'))

    const response = await request(app)
      .post('/api/ideas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileIds: ['00000000-0000-4000-8000-000000000001'],
      })

    expect(response.status).toBe(422)
    expect(response.body).toEqual({ error: 'No content provided', code: 'IDEAS_NO_CONTENT' })
    expect(cleanupOrphanedUploadsMock).not.toHaveBeenCalled()
  })

  it('no intenta cleanup cuando falla por archivo no encontrado', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    createIdeaFromInputMock.mockRejectedValue(
      new HttpError(404, 'File not found', 'IDEAS_FILE_NOT_FOUND'),
    )

    const response = await request(app)
      .post('/api/ideas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'x',
        fileIds: ['00000000-0000-4000-8000-000000000001'],
      })

    expect(response.status).toBe(404)
    expect(cleanupOrphanedUploadsMock).not.toHaveBeenCalled()
  })
})

function refinementQuestionStub(id: string) {
  return {
    id,
    question: '¿Pregunta?',
    context: 'Contexto',
    options: [
      { id: 'a', label: 'A', detail: null },
      { id: 'b', label: 'B', detail: null },
      { id: 'c', label: 'C', detail: null },
      { id: 'custom', label: 'Something else', detail: null },
    ],
  }
}

describe('POST /api/ideas/:id/refine/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 sin autenticacion', async () => {
    const app = buildApp()
    const response = await request(app).post(
      '/api/ideas/00000000-0000-4000-8000-000000000001/refine/questions',
    )

    expect(response.status).toBe(401)
    expect(loadRefinementQuestionsMock).not.toHaveBeenCalled()
  })

  it('retorna 422 si el id no es uuid', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const response = await request(app)
      .post('/api/ideas/no-uuid/refine/questions')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(loadRefinementQuestionsMock).not.toHaveBeenCalled()
  })

  it('retorna 200 con preguntas del servicio', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const payload = {
      questions: ['q1', 'q2', 'q3', 'q4', 'q5'].map(refinementQuestionStub),
    }
    loadRefinementQuestionsMock.mockResolvedValue(payload)

    const response = await request(app)
      .post('/api/ideas/00000000-0000-4000-8000-000000000001/refine/questions')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(loadRefinementQuestionsMock).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
    )
    expect(response.body).toEqual(payload)
  })
})

describe('POST /api/ideas/:id/refine/answers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 422 si answers esta vacio', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const response = await request(app)
      .post('/api/ideas/00000000-0000-4000-8000-000000000001/refine/answers')
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [] })

    expect(response.status).toBe(422)
    expect(submitRefinementMock).not.toHaveBeenCalled()
  })

  it('retorna 200 y delega en submitRefinement', async () => {
    const app = buildApp()
    const token = signTestToken('user-1')
    const body = {
      idea: { id: 'idea-1', title: 'T', status: 'REFINING' },
      nextStep: 'validation' as const,
    }
    submitRefinementMock.mockResolvedValue(body)

    const response = await request(app)
      .post('/api/ideas/00000000-0000-4000-8000-000000000001/refine/answers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: 'q1', answer: 'Uno' },
          { questionId: 'q2', answer: 'Dos' },
        ],
      })

    expect(response.status).toBe(200)
    expect(submitRefinementMock).toHaveBeenCalledWith('user-1', '00000000-0000-4000-8000-000000000001', [
      { questionId: 'q1', answer: 'Uno' },
      { questionId: 'q2', answer: 'Dos' },
    ])
    expect(response.body).toEqual(body)
  })
})
