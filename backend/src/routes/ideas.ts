import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { sendError } from '../lib/apiError'
import { HttpError } from '../lib/httpError'
import { requireAuth } from '../middleware/auth'
import { ideasCreateRateLimit, ideasRefineRateLimit } from '../middleware/rateLimit'
import { validateBody, validateParams } from '../middleware/validate'
import { logger } from '../lib/logger'
import {
  createIdeaSchema,
  listIdeasQuerySchema,
  refineAnswersBodySchema,
  type CreateIdeaBody,
} from '../schemas/idea'
import { createIdeaFromInput, listIdeasForUser } from '../services/ideas'
import { loadRefinementQuestions, submitRefinement } from '../services/ideas/refinement'
import { cleanupOrphanedUploads } from '../services/files/cleanupOrphanedUploads'

const router = Router()

const ideaIdParamsSchema = z.object({ id: z.string().uuid() })

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
