import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../lib/apiError'
import type { ZodSchema } from 'zod'

export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return sendError(
        res,
        422,
        'Validación fallida',
        'VALIDATION_ERROR',
        result.error.flatten(),
      )
    }

    req.body = result.data
    next()
  }

export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)

    if (!result.success) {
      return sendError(
        res,
        422,
        'Validación fallida',
        'VALIDATION_ERROR',
        result.error.flatten(),
      )
    }

    req.params = result.data as Request['params']
    next()
  }
