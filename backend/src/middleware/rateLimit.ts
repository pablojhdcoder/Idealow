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
  message: 'Demasiados intentos de inicio de sesión. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_AUTH_LOGIN',
})

export const authRegisterRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Demasiados intentos de registro. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_AUTH_REGISTER',
})

export const filesUploadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Se alcanzó el límite de subidas. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_FILES_UPLOAD',
})

export const ideasCreateRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 5,
  message: 'Se alcanzó el límite de creación de ideas. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_CREATE',
})

export const suggestionsRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 60,
  message: 'Se alcanzó el límite de sugerencias. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_USERS_SUGGESTIONS',
})

export const suggestionsGenerateRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 25,
  message: 'Se alcanzó el límite de generación de ideas con IA. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_USERS_SUGGESTIONS_GENERATE',
})

export const ideasRefineRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 30,
  message: 'Se alcanzó el límite de refinamiento de ideas. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_REFINE',
})

export const ideasValidationRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 8,
  message: 'Se alcanzó el límite de validaciones. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_VALIDATION',
})

/** Aperturas del stream SSE (cada GET cuenta al inicio; conexiones largas no multiplican). */
export const ideasValidationSseRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 40,
  message: 'Se alcanzó el límite del stream de validación. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_VALIDATION_SSE',
})

/** Búsqueda semántica y similares (embeddings / pgvector). */
export const semanticExploreRateLimit = createRateLimit({
  windowMs: 3 * 60 * 60 * 1000,
  max: 60,
  message: 'Se alcanzó el límite de exploración semántica. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_SEMANTIC_EXPLORE',
})

export const ideasPatchRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Se alcanzó el límite de actualizaciones de ideas. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_PATCH',
})

export const ideasFeedbackPostRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Se alcanzó el límite de feedback. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_IDEAS_FEEDBACK',
})

export const feedListRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Se alcanzó el límite del feed. Vuelve a intentarlo más tarde.',
  code: 'RATE_LIMIT_FEED_LIST',
})
