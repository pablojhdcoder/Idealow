import type { Request } from 'express'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { createIdeaSchema } from '../schemas/idea'
import { extractIdea } from '../services/ai/extractor'
import { processMedia } from '../services/media/processor'
import { prisma } from '../lib/prisma'

const router = Router()
type AuthenticatedRequest = Request & { user: { userId: string } }

router.get('/', (_req, res) => {
  res.json({ ok: true, route: 'ideas' })
})

router.post('/create', requireAuth, validateBody(createIdeaSchema), async (req, res) => {
  try {
    const { content, fileId, sector } = req.body as {
      content?: string
      fileId?: string
      sector?: string
    }

    const userId = (req as AuthenticatedRequest).user.userId

    let rawText = content || ''
    if (fileId) {
      const file = await prisma.file.findFirst({ where: { id: fileId, userId } })
      if (!file) {
        return res.status(404).json({ error: 'File not found' })
      }
      rawText = await processMedia(file.filepath, file.mimeType)
    }

    if (!rawText.trim()) {
      return res.status(422).json({ error: 'No content provided' })
    }

    const extracted = await extractIdea(rawText, sector)

    const idea = await prisma.idea.create({
      data: {
        userId,
        title: extracted.title,
        summary: extracted.elevator_pitch,
        rawContent: rawText,
        sector: extracted.sector || sector,
        status: 'DRAFT',
        files: fileId ? { connect: [{ id: fileId }] } : undefined,
      },
    })

    return res.json({
      ideaId: idea.id,
      extracted,
      nextStep: 'refine',
    })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('UNSUPPORTED_MEDIA:')) {
      return res.status(422).json({ error: err.message.replace('UNSUPPORTED_MEDIA:', '').trim() })
    }
    return res.status(500).json({ error: 'Failed to create idea' })
  }
})

export default router
