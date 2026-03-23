import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      })
    }

    req.body = result.data
    next()
  }
