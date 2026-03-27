import fs from 'fs'
import path from 'path'
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { config } from '../config'
import { sendError } from '../lib/apiError'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { filesUploadRateLimit } from '../middleware/rateLimit'
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

const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(
          res,
          413,
          `File too large (max ${config.maxUploadMb}MB)`,
          'FILES_TOO_LARGE',
        )
      }
      return sendError(res, 422, err.message, 'FILES_UPLOAD_INVALID')
    }
    if (err instanceof Error) {
      if (err.message === 'Unsupported file type') {
        return sendError(res, 422, err.message, 'FILES_UNSUPPORTED_TYPE')
      }
      return sendError(res, 422, err.message, 'FILES_UPLOAD_INVALID')
    }
    if (err) {
      return sendError(res, 500, 'Upload failed', 'FILES_UPLOAD_FAILED')
    }
    next()
  })
}

router.post('/upload', requireAuth, filesUploadRateLimit, uploadSingle, async (req, res) => {
  try {
    const request = req as RequestWithUser
    if (!req.file || !request.user) {
      return sendError(res, 422, 'File is required', 'FILES_REQUIRED')
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
    const safeFile = {
      id: created.id,
      userId: created.userId,
      originalName: created.originalName,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      createdAt: created.createdAt,
    }

    return res.json({ fileId: created.id, file: safeFile })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload file'
    if (message === 'Unsupported file type') {
      return sendError(res, 422, message, 'FILES_UNSUPPORTED_TYPE')
    }
    return sendError(res, 500, 'Failed to upload file', 'FILES_UPLOAD_FAILED')
  }
})

const uuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? ''
    if (!uuidParam.test(id)) {
      return sendError(res, 404, 'File not found', 'FILES_NOT_FOUND')
    }

    const file = await prisma.file.findUnique({ where: { id } })
    if (!file) {
      return sendError(res, 404, 'File not found', 'FILES_NOT_FOUND')
    }

    const request = req as RequestWithUser
    const isOwner = request.user?.userId === file.userId

    let allowed = isOwner
    if (!allowed) {
      if (!file.mimeType.startsWith('image/')) {
        return sendError(res, 403, 'Forbidden', 'FILES_FORBIDDEN')
      }
      const usedAsAvatar = await prisma.user.findFirst({
        where: { avatarUrl: `/api/files/${id}` },
        select: { id: true },
      })
      allowed = Boolean(usedAsAvatar)
    }

    if (!allowed) {
      return sendError(res, 403, 'Forbidden', 'FILES_FORBIDDEN')
    }

    const resolvedPath = path.resolve(file.filepath)
    const uploadRoot = path.resolve(config.uploadDir)
    const relativeToUpload = path.relative(uploadRoot, resolvedPath)
    if (relativeToUpload.startsWith('..') || path.isAbsolute(relativeToUpload)) {
      return sendError(res, 403, 'Forbidden', 'FILES_FORBIDDEN')
    }

    if (!fs.existsSync(file.filepath)) {
      return sendError(res, 404, 'File not found', 'FILES_NOT_FOUND')
    }

    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    const stream = fs.createReadStream(file.filepath)
    stream.on('error', () => {
      if (!res.headersSent) {
        sendError(res, 500, 'Failed to read file', 'FILES_READ_FAILED')
      }
    })
    stream.pipe(res)
  } catch {
    return sendError(res, 500, 'Failed to serve file', 'FILES_SERVE_FAILED')
  }
})

export default router
