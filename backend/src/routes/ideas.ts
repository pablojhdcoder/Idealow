import { Router } from 'express'
import { z } from 'zod'
import { sendError } from '../lib/apiError'
import { HttpError } from '../lib/httpError'
import { optionalAuth, requireAuth } from '../middleware/auth'
import {
  ideasCreateRateLimit,
  ideasFeedbackPostRateLimit,
  ideasPatchRateLimit,
  ideasRefineRateLimit,
  semanticExploreRateLimit,
} from '../middleware/rateLimit'
import { validateBody, validateParams } from '../middleware/validate'
import { logger } from '../lib/logger'
import {
  createIdeaSchema,
  ideaFeedbackBodySchema,
  ideaFeedbackListQuerySchema,
  listIdeasQuerySchema,
  patchIdeaBodySchema,
  refineAnswersBodySchema,
  type CreateIdeaBody,
} from '../schemas/idea'
import { createIdeaFromInput, listIdeasForUser } from '../services/ideas'
import { loadRefinementQuestions, submitRefinement } from '../services/ideas/refinement'
import { cleanupOrphanedUploads } from '../services/files/cleanupOrphanedUploads'
import { hasEmbeddingsConfig } from '../config'
import { prisma } from '../lib/prisma'
import { similarIdeasForUser } from '../services/embeddings/similarity'
import {
  getIdeaFlashcardForViewer,
  listSimilarPublishedFlashcardsForAnchor,
} from '../services/ideas/ideaFlashcard'
import { listIdeaFeedbackComments, submitIdeaFeedback } from '../services/ideas/feedbackService'
import { updateIdeaPublishState } from '../services/ideas/updateIdeaPublish'
import { asyncHandler } from '../lib/asyncHandler'

const router = Router()

const ideaIdParamsSchema = z.object({ id: z.string().uuid() })
const similarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

/** No borrar adjuntos en errores de validación / recurso incorrecto (nunca llegamos a “consumir” la subida en una idea). */
function shouldCleanupOrphanUploadsAfterCreateError(err: unknown): boolean {
  if (!(err instanceof HttpError)) {
    return true
  }
  const skip = new Set([
    'IDEAS_FILE_NOT_FOUND',
    'IDEAS_FILE_ALREADY_ATTACHED',
    'IDEAS_NO_CONTENT',
  ])
  return !skip.has(err.code)
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const parsed = listIdeasQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 422, 'Validación fallida', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    const result = await listIdeasForUser(req.user.userId, parsed.data)
    return res.json(result)
  }),
)

router.get(
  '/:id/similar',
  requireAuth,
  semanticExploreRateLimit,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const parsedQ = similarQuerySchema.safeParse(req.query)
    if (!parsedQ.success) {
      return sendError(res, 422, 'Validación fallida', 'VALIDATION_ERROR', parsedQ.error.flatten())
    }
    const limit = parsedQ.data.limit ?? 8
    const idea = await prisma.idea.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true },
    })
    if (!idea) {
      return sendError(res, 404, 'Idea no encontrada', 'IDEAS_NOT_FOUND')
    }
    if (!hasEmbeddingsConfig()) {
      return sendError(
        res,
        503,
        'Las ideas similares no están configuradas (configura AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS o EMBEDDING_MODEL).',
        'SEMANTIC_NOT_CONFIGURED',
      )
    }
    const ideas = await similarIdeasForUser(req.user.userId, id, limit)
    return res.json({ ideas })
  }),
)

/** Ideas publicadas en la comunidad con embedding, ordenadas por similitud a la idea del usuario (ancla). */
router.get(
  '/:id/similar-feed',
  requireAuth,
  semanticExploreRateLimit,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const parsedQ = similarQuerySchema.safeParse(req.query)
    if (!parsedQ.success) {
      return sendError(res, 422, 'Validación fallida', 'VALIDATION_ERROR', parsedQ.error.flatten())
    }
    const limit = parsedQ.data.limit ?? 8
    if (!hasEmbeddingsConfig()) {
      return sendError(
        res,
        503,
        'Las ideas similares no están configuradas (configura AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS o EMBEDDING_MODEL).',
        'SEMANTIC_NOT_CONFIGURED',
      )
    }
    const items = await listSimilarPublishedFlashcardsForAnchor(
      id,
      req.user.userId,
      req.user.userId,
      limit,
    )
    return res.json({ items })
  }),
)

router.get(
  '/:id/feedback',
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const parsed = ideaFeedbackListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 422, 'Validación fallida', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    const limit = parsed.data.limit ?? 20
    const { items, nextCursor } = await listIdeaFeedbackComments(id, {
      cursor: parsed.data.cursor,
      limit,
    })
    return res.json({
      comments: items.map(c => ({
        id: c.id,
        comment: c.comment,
        vote: c.vote,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
      nextCursor,
    })
  }),
)

router.post(
  '/:id/feedback',
  requireAuth,
  ideasFeedbackPostRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(ideaFeedbackBodySchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const body = req.body as z.infer<typeof ideaFeedbackBodySchema>
    const result = await submitIdeaFeedback({
      ideaId: id,
      userId: req.user.userId,
      vote: body.vote,
      comment: body.comment,
    })
    return res.status(200).json(result)
  }),
)

router.patch(
  '/:id',
  requireAuth,
  ideasPatchRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(patchIdeaBodySchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const { isPublished } = req.body as z.infer<typeof patchIdeaBodySchema>
    const updated = await updateIdeaPublishState(req.user.userId, id, isPublished)
    return res.json({
      id: updated.id,
      isPublished: updated.isPublished,
      publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
    })
  }),
)

router.get(
  '/:id',
  optionalAuth,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const viewerId = req.user?.userId
    const { flashcard, isOwner, validationSnapshot } = await getIdeaFlashcardForViewer(id, viewerId)
    const files = await prisma.file.findMany({
      where: { ideaId: id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    const attachments = files.map(f => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      createdAt: f.createdAt.toISOString(),
    }))
    return res.json({ flashcard, isOwner, attachments, validationSnapshot })
  }),
)

const createIdeaHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
  }
  const userId = req.user.userId
  const { content, fileId, fileIds, sector, isPublished } = req.body as CreateIdeaBody
  const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])]

  try {
    const result = await createIdeaFromInput({
      userId,
      content,
      fileId,
      fileIds: mergedIds.length > 0 ? mergedIds : undefined,
      sector,
      isPublished,
    })
    return res.status(201).json(result)
  } catch (err) {
    if (req.user && shouldCleanupOrphanUploadsAfterCreateError(err)) {
      const merged = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])]
      if (merged.length > 0) {
        try {
          const cleanup = await cleanupOrphanedUploads({
            userId: req.user.userId,
            fileIds: merged,
          })
          if (cleanup.filesystemErrors > 0) {
            logger.warn(
              {
                userId: req.user.userId,
                fileIds: merged,
                cleanup,
              },
              'Limpieza parcial tras fallar la creación de la idea',
            )
          }
        } catch (cleanupError) {
          logger.warn(
            {
              userId: req.user.userId,
              fileIds: merged,
              cleanupError,
            },
            'Falló la limpieza tras un error al crear la idea',
          )
        }
      }
    }
    throw err
  }
})

router.post('/', requireAuth, ideasCreateRateLimit, validateBody(createIdeaSchema), createIdeaHandler)

router.post(
  '/:id/refine/questions',
  requireAuth,
  ideasRefineRateLimit,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const questions = await loadRefinementQuestions(req.user.userId, id)
    return res.json(questions)
  }),
)

router.post(
  '/:id/refine/answers',
  requireAuth,
  ideasRefineRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(refineAnswersBodySchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const { answers } = req.body as z.infer<typeof refineAnswersBodySchema>
    const result = await submitRefinement(req.user.userId, id, answers)
    return res.json(result)
  }),
)

export default router
