import fs from 'fs'
import path from 'path'
import multer from 'multer'
import type { Request } from 'express'
import { Router } from 'express'
import { config } from '../config'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()
type RequestWithUser = Request & { user: { userId: string } }
const allowedMimeTypes = new Set([
  'text/plain',
  'text/markdown',
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'video/mp4',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safe}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Unsupported file type'))
      return
    }
    cb(null, true)
  },
})

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const request = req as RequestWithUser
    if (!req.file || !request.user) {
      return res.status(422).json({ error: 'File is required' })
    }

    const created = await prisma.file.create({
      data: {
        userId: request.user.userId,
        filepath: path.resolve(req.file.path),
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    })

    return res.json({ fileId: created.id, file: created })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload file'
    if (message === 'Unsupported file type') {
      return res.status(422).json({ error: message })
    }
    return res.status(500).json({ error: 'Failed to upload file' })
  }
})

export default router
