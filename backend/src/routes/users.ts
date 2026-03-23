import type { Request } from 'express'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { generateSuggestions } from '../services/ai'
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
    return res.status(500).json({ error: 'Failed to update profile' })
  }
})

router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const request = req as RequestWithUser
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { sectors: true, goal: true, experienceLevel: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const suggestions = await generateSuggestions(user)
    return res.json({ suggestions })
  } catch {
    return res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})

export default router
