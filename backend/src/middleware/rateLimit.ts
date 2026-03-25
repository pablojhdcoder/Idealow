import type { Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { sendError } from '../lib/apiError'

type RateLimitConfig = {
  windowMs: number
  max: number
  message: string
  code: string
}

const resolveClientId = (req: Request): string => {
  if (req.user?.userId) {
    return `user:${req.user.userId}`
  }
  if (req.ip) {
    return `ip:${ipKeyGenerator(req.ip)}`
  }
  return 'ip:unknown'
}

export const createRateLimit = ({ windowMs, max, message, code }: RateLimitConfig) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveClientId,
    handler: (_req, res) => {
      return sendError(res, 429, message, code)
    },
  })

export const authLoginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
  code: 'RATE_LIMIT_AUTH_LOGIN',
})

export const authRegisterRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts. Please try again later.',
  code: 'RATE_LIMIT_AUTH_REGISTER',
})

export const filesUploadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Upload rate limit exceeded. Please try again later.',
  code: 'RATE_LIMIT_FILES_UPLOAD',
})

export const ideasCreateRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Idea creation rate limit exceeded. Please try again later.',
  code: 'RATE_LIMIT_IDEAS_CREATE',
})

export const suggestionsRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Suggestions rate limit exceeded. Please try again later.',
  code: 'RATE_LIMIT_USERS_SUGGESTIONS',
})

export const ideasRefineRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Idea refinement rate limit exceeded. Please try again later.',
  code: 'RATE_LIMIT_IDEAS_REFINE',
})
