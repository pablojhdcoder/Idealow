import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { HttpError } from '../../src/lib/httpError'
import { errorHandler } from '../../src/middleware/errors'

function buildAppForError(err: unknown) {
  const app = express()
  app.get('/boom', (_req, _res, next) => next(err))
  app.use(errorHandler)
  return app
}

describe('errorHandler envelope', () => {
  it('serializa HttpError con code y details', async () => {
    const app = buildAppForError(
      new HttpError(422, 'Validation failed', 'VALIDATION_ERROR', { fieldErrors: { email: ['required'] } }),
    )

    const response = await request(app).get('/boom')

    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: { email: ['required'] } },
    })
  })
})
