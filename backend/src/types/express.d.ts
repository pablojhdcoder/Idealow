import type { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string }
    }
  }
}

export type AuthenticatedRequest = Request & { user: { userId: string } }
