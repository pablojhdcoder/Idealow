import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { config } from '../config'
import { prisma } from '../lib/prisma'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { signToken, verifyToken } from '../lib/jwt'
import { authLoginRateLimit, authRegisterRateLimit } from '../middleware/rateLimit'
import { validateBody } from '../middleware/validate'
import { z } from 'zod'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const cookieOpts = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/' as const,
}

const clearCookieOpts = {
  httpOnly: cookieOpts.httpOnly,
  secure: cookieOpts.secure,
  sameSite: cookieOpts.sameSite,
  path: '/' as const,
}

router.post(
  '/register',
  authRegisterRateLimit,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body as {
      email: string
      username: string
      password: string
    }

    const passwordHash = await bcrypt.hash(password, 12)
    try {
      const user = await prisma.user.create({
        data: { email, username, passwordHash },
        select: { id: true, email: true, username: true, avatarUrl: true, sectors: true, goal: true },
      })
      res.cookie('token', signToken(user.id), cookieOpts)
      return res.json({ user, needsOnboarding: true })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return sendError(
          res,
          409,
          'No se pudo completar el registro. Prueba con otro correo o nombre de usuario.',
          'AUTH_REGISTER_CONFLICT',
        )
      }
      throw e
    }
  }),
)

router.post(
  '/login',
  authLoginRateLimit,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return sendError(res, 401, 'Credenciales incorrectas', 'AUTH_INVALID_CREDENTIALS')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return sendError(res, 401, 'Credenciales incorrectas', 'AUTH_INVALID_CREDENTIALS')

    res.cookie('token', signToken(user.id), cookieOpts)
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        sectors: user.sectors,
        goal: user.goal,
      },
      needsOnboarding: user.sectors.length === 0,
    })
  }),
)

router.post('/logout', (_req, res) => {
  res.clearCookie('token', clearCookieOpts)
  return res.json({ success: true })
})

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const bearer = req.headers.authorization?.split(' ')[1]
    const token = (req.cookies?.token as string | undefined) || bearer
    if (!token) return sendError(res, 401, 'No autenticado', 'AUTH_NOT_AUTHENTICATED')
    try {
      const { userId } = verifyToken(token)
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
      if (!user) return sendError(res, 404, 'Usuario no encontrado', 'AUTH_USER_NOT_FOUND')
      return res.json({ user })
    } catch {
      return sendError(res, 401, 'Token no válido', 'AUTH_INVALID_TOKEN')
    }
  }),
)

export default router
