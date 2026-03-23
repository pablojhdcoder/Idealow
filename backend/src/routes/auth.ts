import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken, verifyToken } from '../lib/jwt'
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

router.post('/register', validateBody(registerSchema), async (req, res) => {
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
      return res.status(409).json({ error: 'Email or username already taken' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, sectors: true, goal: true },
    })

    res.cookie('token', signToken(user.id), cookieOpts)
    return res.json({ user, needsOnboarding: true })
  } catch {
    return res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    res.cookie('token', signToken(user.id), cookieOpts)
    return res.json({
      user: { id: user.id, email: user.email, username: user.username, sectors: user.sectors, goal: user.goal },
      needsOnboarding: user.sectors.length === 0,
    })
  } catch {
    return res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  return res.json({ success: true })
})

router.get('/me', async (req, res) => {
  const token = req.cookies?.token as string | undefined
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
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
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({ user })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
