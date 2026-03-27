import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { sendError } from '../lib/apiError'
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
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

router.post('/register', authRegisterRateLimit, validateBody(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.body as {
      email: string
      username: string
      password: string
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) {
      return sendError(
        res,
        409,
        'Email or username already taken',
        'AUTH_REGISTER_CONFLICT',
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, avatarUrl: true, sectors: true, goal: true },
    })

    res.cookie('token', signToken(user.id), cookieOpts)
    return res.json({ user, needsOnboarding: true })
  } catch {
    return sendError(res, 500, 'Registration failed', 'AUTH_REGISTER_FAILED')
  }
})

router.post('/login', authLoginRateLimit, validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return sendError(res, 401, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return sendError(res, 401, 'Invalid credentials', 'AUTH_INVALID_CREDENTIALS')

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
  } catch {
    return sendError(res, 500, 'Login failed', 'AUTH_LOGIN_FAILED')
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  return res.json({ success: true })
})

router.get('/me', async (req, res) => {
  const bearer = req.headers.authorization?.split(' ')[1]
  const token = (req.cookies?.token as string | undefined) || bearer
  if (!token) return sendError(res, 401, 'Not authenticated', 'AUTH_NOT_AUTHENTICATED')
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
    if (!user) return sendError(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND')
    return res.json({ user })
  } catch {
    return sendError(res, 401, 'Invalid token', 'AUTH_INVALID_TOKEN')
  }
})

export default router
