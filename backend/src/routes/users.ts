import type { Request } from 'express'
import { Router } from 'express'
import { sendError } from '../lib/apiError'
import { requireAuth } from '../middleware/auth'
import { suggestionsRateLimit } from '../middleware/rateLimit'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { STATIC_IDEA_SUGGESTIONS } from '../lib/staticSuggestions'
import { z } from 'zod'

const router = Router()
type RequestWithUser = Request & { user: { userId: string } }

const profileSchema = z.object({
  sectors: z.array(z.string()).min(1).max(5),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PROFESSIONAL']),
  goal: z.enum(['HACKATHON', 'SIDE_PROJECT', 'STARTUP', 'LEARNING']),
})

router.patch('/profile', requireAuth, validateBody(profileSchema), async (req, res) => {
  try {
    const request = req as RequestWithUser
    const user = await prisma.user.update({
      where: { id: request.user.userId },
      data: req.body as { sectors: string[]; experienceLevel: string; goal: string },
      select: {
        id: true,
        email: true,
        username: true,
        sectors: true,
        goal: true,
        experienceLevel: true,
      },
    })
    return res.json({ user })
  } catch {
    return sendError(res, 500, 'Failed to update profile', 'USERS_PROFILE_UPDATE_FAILED')
  }
})

router.get('/suggestions', requireAuth, suggestionsRateLimit, async (req, res) => {
  try {
    const request = req as RequestWithUser
    const exists = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { id: true },
    })
    if (!exists) return sendError(res, 404, 'User not found', 'USERS_NOT_FOUND')
    /** Ejemplos fijos (no se llama a ningún modelo). */
    return res.json({ suggestions: [...STATIC_IDEA_SUGGESTIONS] })
  } catch {
    return sendError(
      res,
      500,
      'Failed to generate suggestions',
      'USERS_SUGGESTIONS_FAILED',
    )
  }
})

export default router
