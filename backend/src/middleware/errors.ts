import type { NextFunction, Request, Response } from 'express'
import { config } from '../config'

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = err instanceof Error ? err.message : 'Internal server error'
  const payload =
    config.nodeEnv === 'development'
      ? { error: message, details: err }
      : { error: 'Internal server error' }

  res.status(500).json(payload)
}
