import type { NextFunction, Request, Response } from 'express'
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
import { getIdeaFlashcardForViewer } from '../services/ideas/ideaFlashcard'
import { listIdeaFeedbackComments, submitIdeaFeedback } from '../services/ideas/feedbackService'
import { updateIdeaPublishState } from '../services/ideas/updateIdeaPublish'

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

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
    }
    const parsed = listIdeasQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    const result = await listIdeasForUser(req.user.userId, parsed.data)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get(
  '/:id/similar',
  requireAuth,
  semanticExploreRateLimit,
  validateParams(ideaIdParamsSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
      }
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const parsedQ = similarQuerySchema.safeParse(req.query)
      if (!parsedQ.success) {
        return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsedQ.error.flatten())
      }
      const limit = parsedQ.data.limit ?? 8
      const idea = await prisma.idea.findFirst({
        where: { id, userId: req.user.userId },
        select: { id: true },
      })
      if (!idea) {
        return sendError(res, 404, 'Idea not found', 'IDEAS_NOT_FOUND')
      }
      if (!hasEmbeddingsConfig()) {
        return sendError(
          res,
          503,
          'Similar ideas is not configured (set AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS or EMBEDDING_MODEL).',
          'SEMANTIC_NOT_CONFIGURED',
        )
      }
      const ideas = await similarIdeasForUser(req.user.userId, id, limit)
      return res.json({ ideas })
    } catch (err) {
      next(err)
    }
  },
)

router.get(
  '/:id/feedback',
  validateParams(ideaIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const parsed = ideaFeedbackListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten())
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
    } catch (err) {
      next(err)
    }
  },
)

router.post(
  '/:id/feedback',
  requireAuth,
  ideasFeedbackPostRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(ideaFeedbackBodySchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
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
    } catch (err) {
      next(err)
    }
  },
)

router.patch(
  '/:id',
  requireAuth,
  ideasPatchRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(patchIdeaBodySchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
      }
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const { isPublished } = req.body as z.infer<typeof patchIdeaBodySchema>
      const updated = await updateIdeaPublishState(req.user.userId, id, isPublished)
      return res.json({
        id: updated.id,
        isPublished: updated.isPublished,
        publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
      })
    } catch (err) {
      next(err)
    }
  },
)

router.get(
  '/:id',
  optionalAuth,
  validateParams(ideaIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const viewerId = req.user?.userId
      const { flashcard, isOwner } = await getIdeaFlashcardForViewer(id, viewerId)
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
      return res.json({ flashcard, isOwner, attachments })
    } catch (err) {
      next(err)
    }
  },
)

const createIdeaHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
    }
    const userId = req.user.userId
    const { content, fileId, fileIds, sector } = req.body as CreateIdeaBody
    const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])]

    const result = await createIdeaFromInput({
      userId,
      content,
      fileId,
      fileIds: mergedIds.length > 0 ? mergedIds : undefined,
      sector,
    })
    return res.status(201).json(result)
  } catch (err) {
    if (req.user && shouldCleanupOrphanUploadsAfterCreateError(err)) {
      const { fileId, fileIds } = req.body as CreateIdeaBody
      const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])]
      if (mergedIds.length > 0) {
        try {
          const cleanup = await cleanupOrphanedUploads({
            userId: req.user.userId,
            fileIds: mergedIds,
          })
          if (cleanup.filesystemErrors > 0) {
            logger.warn(
              {
                userId: req.user.userId,
                fileIds: mergedIds,
                cleanup,
              },
              'Partial cleanup after failed idea creation',
            )
          }
        } catch (cleanupError) {
          logger.warn(
            {
              userId: req.user.userId,
              fileIds: mergedIds,
              cleanupError,
            },
            'Cleanup failed after idea creation error',
          )
        }
      }
    }
    next(err)
  }
}

router.post('/', requireAuth, ideasCreateRateLimit, validateBody(createIdeaSchema), createIdeaHandler)

router.post(
  '/:id/refine/questions',
  requireAuth,
  ideasRefineRateLimit,
  validateParams(ideaIdParamsSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
      }
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const questions = await loadRefinementQuestions(req.user.userId, id)
      return res.json(questions)
    } catch (err) {
      next(err)
    }
  },
)

router.post(
  '/:id/refine/answers',
  requireAuth,
  ideasRefineRateLimit,
  validateParams(ideaIdParamsSchema),
  validateBody(refineAnswersBodySchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
      }
      const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
      const { answers } = req.body as z.infer<typeof refineAnswersBodySchema>
      const result = await submitRefinement(req.user.userId, id, answers)
      return res.json(result)
    } catch (err) {
      next(err)
    }
  },
)

export default router
