import type { Request } from 'express'
import { Router } from 'express'
import { sendError } from '../lib/apiError'
import { requireAuth } from '../middleware/auth'
import { suggestionsRateLimit } from '../middleware/rateLimit'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { STATIC_IDEA_SUGGESTIONS } from '../lib/staticSuggestions'
import { deleteOwnedAvatarFile } from '../services/users/avatarFile'
import { z } from 'zod'

const router = Router()
type RequestWithUser = Request & { user: { userId: string } }

const avatarUrlField = z
  .union([
    z.string().url(),
    z.literal(''),
    z.string().regex(/^\/api\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  ])
  .optional()

const profileSchema = z
  .object({
    sectors: z.array(z.string()).min(1).max(5).optional(),
    experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'PROFESSIONAL']).optional(),
    goal: z.enum(['HACKATHON', 'SIDE_PROJECT', 'STARTUP', 'LEARNING']).optional(),
    avatarUrl: avatarUrlField,
    /** Fichero ya subido con `POST /api/files/upload` (imagen). */
    avatarFileId: z.string().uuid().optional(),
  })
  .refine(data => !(data.avatarFileId !== undefined && data.avatarUrl !== undefined), {
    message: 'Cannot send both avatarFileId and avatarUrl',
  })
  .refine(
    data =>
      data.sectors !== undefined ||
      data.experienceLevel !== undefined ||
      data.goal !== undefined ||
      data.avatarUrl !== undefined ||
      data.avatarFileId !== undefined,
    {
      message: 'At least one profile field must be provided',
    },
  )

router.patch('/profile', requireAuth, validateBody(profileSchema), async (req, res) => {
  try {
    const request = req as RequestWithUser
    const parsed = profileSchema.parse(req.body)

    const previous = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { avatarUrl: true },
    })

    let nextAvatarUrl: string | null | undefined
    if (parsed.avatarFileId !== undefined) {
      const file = await prisma.file.findFirst({
        where: { id: parsed.avatarFileId, userId: request.user.userId },
      })
      if (!file || !file.mimeType.startsWith('image/')) {
        return sendError(res, 422, 'Invalid avatar image file', 'USERS_AVATAR_FILE_INVALID')
      }
      nextAvatarUrl = `/api/files/${file.id}`
    } else if (parsed.avatarUrl !== undefined) {
      nextAvatarUrl =
        parsed.avatarUrl.trim().length > 0 ? parsed.avatarUrl.trim() : null
    }

    const data = {
      ...(parsed.sectors !== undefined ? { sectors: parsed.sectors } : {}),
      ...(parsed.experienceLevel !== undefined ? { experienceLevel: parsed.experienceLevel } : {}),
      ...(parsed.goal !== undefined ? { goal: parsed.goal } : {}),
      ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
    }

    const user = await prisma.user.update({
      where: { id: request.user.userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        sectors: true,
        goal: true,
        experienceLevel: true,
      },
    })

    if (nextAvatarUrl !== undefined && previous?.avatarUrl !== user.avatarUrl) {
      await deleteOwnedAvatarFile(request.user.userId, previous?.avatarUrl)
    }

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
