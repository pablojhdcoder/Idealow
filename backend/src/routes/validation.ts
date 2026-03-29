import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { ideasValidationRateLimit, ideasValidationSseRateLimit } from '../middleware/rateLimit'
import { validateParams } from '../middleware/validate'
import { runValidation } from '../services/validation/runValidation'
import {
  registerValidationSseClient,
  unregisterValidationSseClient,
} from '../services/validation/sseHub'

const router = Router()

const ideaIdParamsSchema = z.object({ id: z.string().uuid() })

router.post(
  '/ideas/:id/validate',
  requireAuth,
  ideasValidationRateLimit,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const idea = await prisma.idea.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true, status: true, validationScore: true, validationData: true },
    })
    if (!idea) {
      return sendError(res, 404, 'Idea not found', 'VALIDATION_IDEA_NOT_FOUND')
    }
    if (idea.validationScore != null && idea.validationData != null) {
      return res.json({ status: 'already_validated', ideaId: id })
    }
    if (idea.status !== 'REFINING' && idea.status !== 'VALIDATED') {
      return sendError(
        res,
        400,
        'Refine the idea before running validation.',
        'VALIDATION_BAD_STATUS',
      )
    }
    void runValidation(id, req.user.userId).catch(err => {
      logger.error({ ideaId: id, err }, 'runValidation failed')
    })
    return res.json({ status: 'started', ideaId: id })
  }),
)

router.get(
  '/ideas/:id/validate/stream',
  requireAuth,
  ideasValidationSseRateLimit,
  validateParams(ideaIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
    }
    const { id } = req.params as z.infer<typeof ideaIdParamsSchema>
    const idea = await prisma.idea.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true },
    })
    if (!idea) {
      return sendError(res, 404, 'Idea not found', 'VALIDATION_IDEA_NOT_FOUND')
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders()
    }

    // Antes de registrar: primer chunk para proxies que bufferizan SSE; el cliente arranca el POST al leer `ready`.
    res.write(`data: ${JSON.stringify({ type: 'ready' })}\n\n`)
    registerValidationSseClient(id, res)

    req.on('close', () => {
      unregisterValidationSseClient(id, res)
    })
  }),
)

export default router
