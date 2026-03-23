import type { NextFunction, Request, Response } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  const startedAt = new Date().toISOString()

  console.log(
    `[REQ] ${startedAt} ${req.method} ${req.originalUrl} from ${req.ip ?? 'unknown-ip'}`,
  )

  res.on('finish', () => {
    const durationMs = Date.now() - start
    const finishedAt = new Date().toISOString()

    console.log(
      `[RES] ${finishedAt} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`,
    )
  })

  next()
}
