import type { NextFunction, Request, Response } from 'express'
import { config } from '../config'
import { sendError } from '../lib/apiError'
import { HttpError } from '../lib/httpError'
import { logger } from '../lib/logger'

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof HttpError) {
    logger.warn(
      {
        statusCode: err.statusCode,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.userId ?? null,
        code: err.code,
        details: err.details,
      },
      err.message,
    )
    return sendError(res, err.statusCode, err.message, err.code, err.details)
  }

  const message = err instanceof Error ? err.message : 'Error interno del servidor'

  logger.error(
    {
      err,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.userId ?? null,
    },
    'Error no controlado',
  )

  return sendError(
    res,
    500,
    config.nodeEnv === 'development' ? message : 'Error interno del servidor',
    'INTERNAL_SERVER_ERROR',
    config.nodeEnv === 'development'
      ? err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err
      : undefined,
  )
}
