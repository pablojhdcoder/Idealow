import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Envuelve handlers async de Express: los rechazos de promesa llegan al `errorHandler` global
 * sin repetir try/catch en cada ruta.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(fn(req, res, next)).catch(next)
  }
}
