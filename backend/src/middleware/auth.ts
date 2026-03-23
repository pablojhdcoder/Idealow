import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../lib/jwt'

type RequestWithUser = Request & { user?: { userId: string } }

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const request = req as RequestWithUser
  const bearer = req.headers.authorization?.split(' ')[1]
  const token = req.cookies?.token || bearer

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    request.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
