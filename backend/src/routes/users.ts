import type { Request } from 'express'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/httpError'
import { requireAuth } from '../middleware/auth'
import { suggestionsGenerateRateLimit, suggestionsRateLimit } from '../middleware/rateLimit'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { STATIC_IDEA_SUGGESTIONS } from '../lib/staticSuggestions'
import { deleteOwnedAvatarFile } from '../services/users/avatarFile'
import { generateProfileIdeaSuggestion } from '../services/ai/generateProfileIdeaSuggestion'
import { z } from 'zod'

const router = Router()
type RequestWithUser = Request & { user: { userId: string } }

/** Solo avatares servidos por esta API (subida previa) o vacío para limpiar. Sin URLs externas. */
const avatarUrlField = z
  .union([
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
    username: z.string().trim().min(3).max(30).optional(),
    email: z.string().trim().email().optional(),
  })
  .refine(data => !(data.avatarFileId !== undefined && data.avatarUrl !== undefined), {
    message: 'No puedes enviar ambos: avatarFileId y avatarUrl',
  })
  .refine(
    data =>
      data.sectors !== undefined ||
      data.experienceLevel !== undefined ||
      data.goal !== undefined ||
      data.avatarUrl !== undefined ||
      data.avatarFileId !== undefined ||
      data.username !== undefined ||
      data.email !== undefined,
    {
      message: 'Debes proporcionar al menos un campo de perfil',
    },
  )

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

function buildFallbackSuggestionText(opts: {
  username: string
  sectors: string[]
  goal: string
  experienceLevel: string
}): string {
  const seed = `${opts.username}:${opts.goal}:${opts.experienceLevel}:${opts.sectors.join(',')}`
  const hash = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7)
  const base = STATIC_IDEA_SUGGESTIONS[hash % STATIC_IDEA_SUGGESTIONS.length] ?? STATIC_IDEA_SUGGESTIONS[0]
  const sectorText = opts.sectors.length > 0 ? opts.sectors.join(', ') : 'varios'
  return `${base} Me interesa encajarlo con mi perfil (${sectorText}, objetivo ${opts.goal}, nivel ${opts.experienceLevel}) y pulirlo antes de refinar.`
}

router.patch(
  '/profile',
  requireAuth,
  validateBody(profileSchema),
  asyncHandler(async (req, res) => {
    try {
      const request = req as RequestWithUser
      const parsed = profileSchema.parse(req.body)

      const previous = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { avatarUrl: true, email: true, username: true },
      })
      if (!previous) return sendError(res, 404, 'Usuario no encontrado', 'USERS_NOT_FOUND')

      if (parsed.username !== undefined) {
        const nextUsername = parsed.username.trim()
        if (nextUsername !== previous.username) {
          const taken = await prisma.user.findUnique({
            where: { username: nextUsername },
            select: { id: true },
          })
          if (taken)
            return sendError(res, 409, 'Ese nombre de usuario ya está en uso', 'USERS_USERNAME_TAKEN')
        }
      }

      if (parsed.email !== undefined) {
        const nextEmail = parsed.email.trim().toLowerCase()
        if (nextEmail !== previous.email.toLowerCase()) {
          const taken = await prisma.user.findUnique({
            where: { email: nextEmail },
            select: { id: true },
          })
          if (taken) return sendError(res, 409, 'Ese correo ya está registrado', 'USERS_EMAIL_TAKEN')
        }
      }

      let nextAvatarUrl: string | null | undefined
      if (parsed.avatarFileId !== undefined) {
        const file = await prisma.file.findFirst({
          where: { id: parsed.avatarFileId, userId: request.user.userId },
        })
        if (!file || !file.mimeType.startsWith('image/')) {
          return sendError(res, 422, 'Archivo de imagen de avatar no válido', 'USERS_AVATAR_FILE_INVALID')
        }
        nextAvatarUrl = `/api/files/${file.id}`
      } else if (parsed.avatarUrl !== undefined) {
        const raw = parsed.avatarUrl.trim()
        if (raw.length === 0) {
          nextAvatarUrl = null
        } else {
          const fileId = raw.slice('/api/files/'.length)
          const file = await prisma.file.findFirst({
            where: { id: fileId, userId: request.user.userId },
          })
          if (!file || !file.mimeType.startsWith('image/')) {
            return sendError(res, 422, 'Archivo de imagen de avatar no válido', 'USERS_AVATAR_FILE_INVALID')
          }
          nextAvatarUrl = `/api/files/${file.id}`
        }
      }

      const data = {
        ...(parsed.sectors !== undefined ? { sectors: parsed.sectors } : {}),
        ...(parsed.experienceLevel !== undefined ? { experienceLevel: parsed.experienceLevel } : {}),
        ...(parsed.goal !== undefined ? { goal: parsed.goal } : {}),
        ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
        ...(parsed.username !== undefined ? { username: parsed.username.trim() } : {}),
        ...(parsed.email !== undefined ? { email: parsed.email.trim().toLowerCase() } : {}),
      }

      let user
      try {
        user = await prisma.user.update({
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
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return sendError(
            res,
            409,
            'Correo o nombre de usuario ya en uso',
            'USERS_PROFILE_CONFLICT',
          )
        }
        throw e
      }

      if (nextAvatarUrl !== undefined && previous.avatarUrl !== user.avatarUrl) {
        await deleteOwnedAvatarFile(request.user.userId, previous.avatarUrl)
      }

      return res.json({ user })
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(500, 'Error al actualizar el perfil', 'USERS_PROFILE_UPDATE_FAILED')
    }
  }),
)

router.post(
  '/password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const request = req as RequestWithUser
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>

    const row = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { id: true, passwordHash: true },
    })
    if (!row) return sendError(res, 404, 'Usuario no encontrado', 'USERS_NOT_FOUND')

    const ok = await bcrypt.compare(currentPassword, row.passwordHash)
    if (!ok)
      return sendError(res, 401, 'La contraseña actual no es correcta', 'USERS_PASSWORD_INCORRECT')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: request.user.userId },
      data: { passwordHash },
    })

    return res.json({ success: true })
  }),
)

router.get(
  '/suggestions',
  requireAuth,
  suggestionsRateLimit,
  asyncHandler(async (req, res) => {
    try {
      const request = req as RequestWithUser
      const exists = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true },
      })
      if (!exists) return sendError(res, 404, 'Usuario no encontrado', 'USERS_NOT_FOUND')
      /** Ejemplos fijos (no se llama a ningún modelo). */
      return res.json({ suggestions: [...STATIC_IDEA_SUGGESTIONS] })
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(500, 'Error al obtener sugerencias', 'USERS_SUGGESTIONS_FAILED')
    }
  }),
)

router.post(
  '/suggestions/generate',
  requireAuth,
  suggestionsGenerateRateLimit,
  asyncHandler(async (req, res) => {
    try {
      const request = req as RequestWithUser
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          username: true,
          sectors: true,
          goal: true,
          experienceLevel: true,
        },
      })
      if (!user) return sendError(res, 404, 'Usuario no encontrado', 'USERS_NOT_FOUND')

      let content: string
      try {
        content = await generateProfileIdeaSuggestion({
          username: user.username,
          sectors: user.sectors,
          goal: user.goal,
          experienceLevel: user.experienceLevel,
        })
      } catch (error) {
        logger.warn(
          {
            userId: request.user.userId,
            error,
          },
          'Fallo generando sugerencia IA; se usa fallback local',
        )
        content = buildFallbackSuggestionText({
          username: user.username,
          sectors: user.sectors,
          goal: user.goal,
          experienceLevel: user.experienceLevel,
        })
      }

      return res.json({ content })
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(500, 'Error al generar sugerencia IA', 'USERS_SUGGESTION_GENERATE_FAILED')
    }
  }),
)

export default router
