import { Router } from 'express'
import { z } from 'zod'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { requireAuth } from '../middleware/auth'
import { semanticExploreRateLimit } from '../middleware/rateLimit'
import { hasEmbeddingsConfig } from '../config'
import { semanticSearchForUser } from '../services/embeddings/similarity'

const router = Router()

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

router.get(
  '/search',
  requireAuth,
  semanticExploreRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
    }
    const parsed = searchQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    if (!hasEmbeddingsConfig()) {
      return sendError(
        res,
        503,
        'Semantic search is not configured (set AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS or EMBEDDING_MODEL).',
        'SEMANTIC_NOT_CONFIGURED',
      )
    }
    const limit = parsed.data.limit ?? 10
    const ideas = await semanticSearchForUser(req.user.userId, parsed.data.q, limit)
    return res.json({ ideas })
  }),
)

export default router
