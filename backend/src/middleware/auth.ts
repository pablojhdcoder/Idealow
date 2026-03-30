import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../lib/apiError'
import { verifyToken } from '../lib/jwt'

type RequestWithUser = Request & { user?: { userId: string } }

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const request = req as RequestWithUser
  const bearer = req.headers.authorization?.split(' ')[1]
  const token = req.cookies?.token || bearer

  if (!token) {
    return sendError(res, 401, 'No autenticado', 'AUTH_UNAUTHORIZED')
  }

  try {
    request.user = verifyToken(token)
    next()
  } catch {
    return sendError(res, 401, 'Token inválido', 'AUTH_INVALID_TOKEN')
  }
}

/** Rellena `req.user` si hay cookie/bearer válido; si no hay token o es inválido, sigue sin usuario. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const request = req as RequestWithUser
  const bearer = req.headers.authorization?.split(' ')[1]
  const token = req.cookies?.token || bearer

  if (!token) {
    return next()
  }

  try {
    request.user = verifyToken(token)
  } catch {
    // ignorar token inválido para rutas públicas
  }
  next()
}
