import fs from 'fs'
import path from 'path'
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { config } from '../config'
import { sendError } from '../lib/apiError'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../lib/httpError'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { filesUploadRateLimit } from '../middleware/rateLimit'
import { validateBody } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { cleanupOrphanedUploads } from '../services/files/cleanupOrphanedUploads'
import { abandonUploadsBodySchema } from '../schemas/files'

const router = Router()
type RequestWithUser = Request & { user: { userId: string } }
const allowedMimeTypes = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
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

/** Algunos SO/navegadores envían `application/octet-stream` o vacío para .md / .txt. */
const textExtensionsForAmbiguousMime = new Set(['txt', 'md', 'markdown'])

function isAllowedUploadFile(file: Express.Multer.File): boolean {
  if (allowedMimeTypes.has(file.mimetype)) return true
  const ext = path.extname(file.originalname).replace(/^\./, '').toLowerCase()
  if (!textExtensionsForAmbiguousMime.has(ext)) return false
  return file.mimetype === 'application/octet-stream' || file.mimetype === ''
}

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
    if (!isAllowedUploadFile(file)) {
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
          `Archivo demasiado grande (máx. ${config.maxUploadMb}MB)`,
          'FILES_TOO_LARGE',
        )
      }
      return sendError(res, 422, 'Error al subir el archivo', 'FILES_UPLOAD_INVALID')
    }
    if (err instanceof Error) {
      if (err.message === 'Unsupported file type') {
        return sendError(res, 422, 'Tipo de archivo no compatible', 'FILES_UNSUPPORTED_TYPE')
      }
      return sendError(res, 422, 'Error al subir el archivo', 'FILES_UPLOAD_INVALID')
    }
    if (err) {
      return sendError(res, 500, 'Error al subir el archivo', 'FILES_UPLOAD_FAILED')
    }
    next()
  })
}

router.post(
  '/upload',
  requireAuth,
  filesUploadRateLimit,
  uploadSingle,
  asyncHandler(async (req, res) => {
    const request = req as RequestWithUser
    if (!req.file || !request.user) {
      return sendError(res, 422, 'Se requiere un archivo', 'FILES_REQUIRED')
    }

    try {
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
      const message = err instanceof Error ? err.message : 'Error al subir el archivo'
      if (message === 'Unsupported file type') {
      return sendError(res, 422, 'Tipo de archivo no compatible', 'FILES_UNSUPPORTED_TYPE')
      }
      throw new HttpError(500, 'Error al subir el archivo', 'FILES_UPLOAD_FAILED')
    }
  }),
)

router.post(
  '/abandon-uploads',
  requireAuth,
  validateBody(abandonUploadsBodySchema),
  asyncHandler(async (req, res) => {
    const request = req as RequestWithUser
    if (!request.user) {
      return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
    }
    const { fileIds } = req.body as { fileIds: string[] }
    const result = await cleanupOrphanedUploads({
      userId: request.user.userId,
      fileIds,
    })
    return res.json({ ok: true as const, ...result })
  }),
)

const uuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? ''
      if (!uuidParam.test(id)) {
        return sendError(res, 404, 'Archivo no encontrado', 'FILES_NOT_FOUND')
      }

      const file = await prisma.file.findUnique({ where: { id } })
      if (!file) {
        return sendError(res, 404, 'Archivo no encontrado', 'FILES_NOT_FOUND')
      }

      const request = req as RequestWithUser
      const isFileUploader = request.user?.userId === file.userId

      let allowed = isFileUploader

      if (!allowed && file.ideaId) {
        const idea = await prisma.idea.findUnique({
          where: { id: file.ideaId },
          select: { userId: true, isPublished: true, status: true },
        })
        if (idea?.isPublished && idea.status === 'VALIDATED') {
          allowed = true
        } else if (idea && request.user?.userId === idea.userId) {
          allowed = true
        }
      }

      if (!allowed) {
        if (!file.mimeType.startsWith('image/')) {
          return sendError(res, 403, 'No autorizado', 'FILES_FORBIDDEN')
        }
        /** Solo el dueño del fichero puede hacerlo visible como avatar (evita enlazar UUID ajenos). */
        const usedAsAvatar = await prisma.user.findFirst({
          where: { avatarUrl: `/api/files/${id}`, id: file.userId },
          select: { id: true },
        })
        allowed = Boolean(usedAsAvatar)
      }

      if (!allowed) {
        return sendError(res, 403, 'No autorizado', 'FILES_FORBIDDEN')
      }

      const resolvedPath = path.resolve(file.filepath)
      const uploadRoot = path.resolve(config.uploadDir)
      const relativeToUpload = path.relative(uploadRoot, resolvedPath)
      if (relativeToUpload.startsWith('..') || path.isAbsolute(relativeToUpload)) {
        return sendError(res, 403, 'No autorizado', 'FILES_FORBIDDEN')
      }

      if (!fs.existsSync(file.filepath)) {
        return sendError(res, 404, 'Archivo no encontrado', 'FILES_NOT_FOUND')
      }

      res.setHeader('Content-Type', file.mimeType)
      res.setHeader('Cache-Control', 'public, max-age=3600')
      const stream = fs.createReadStream(file.filepath)
      stream.on('error', () => {
        if (!res.headersSent) {
          sendError(res, 500, 'Error al leer el archivo', 'FILES_READ_FAILED')
        }
      })
      stream.pipe(res)
    } catch {
      throw new HttpError(500, 'Error al servir el archivo', 'FILES_SERVE_FAILED')
    }
  }),
)

export default router
