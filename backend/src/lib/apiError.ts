import type { Response } from 'express'

export type ApiErrorBody = {
  error: string
  code: string
  details?: unknown
}

export const sendError = (
  res: Response,
  status: number,
  error: string,
  code: string,
  details?: unknown,
) => {
  const payload: ApiErrorBody = { error, code }
  if (details !== undefined) {
    payload.details = details
  }
  return res.status(status).json(payload)
}
