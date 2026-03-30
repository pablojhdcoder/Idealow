import { Router } from 'express'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { feedListRateLimit } from '../middleware/rateLimit'
import { feedQuerySchema } from '../schemas/idea'
import { listPublishedFeed } from '../services/feed/listPublishedFeed'

const router = Router()

router.get(
  '/',
  feedListRateLimit,
  asyncHandler(async (req, res) => {
    const parsed = feedQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendError(res, 422, 'Validación fallida', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    const q = parsed.data
    const limit = q.limit ?? 20
    const sort = q.sort ?? 'new'
    const filter = q.filter ?? 'all'

    const result = await listPublishedFeed({
      limit,
      cursor: q.cursor,
      page: q.page,
      sector: q.sector,
      sort,
      filter,
      q: q.q,
    })

    return res.json({
      items: result.items,
      nextCursor: result.nextCursor,
      nextPage: result.nextPage,
    })
  }),
)

export default router
