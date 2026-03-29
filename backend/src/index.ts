import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import type { CorsOptions } from 'cors'
import { config } from './config'
import authRoutes from './routes/auth'
import ideasRoutes from './routes/ideas'
import validationRoutes from './routes/validation'
import usersRoutes from './routes/users'
import feedRoutes from './routes/feed'
import filesRoutes from './routes/files'
import semanticRoutes from './routes/semantic'
import { errorHandler } from './middleware/errors'
import { requestLogger } from './middleware/requestLogger'
import { logger } from './lib/logger'

const app = express()

app.set('trust proxy', config.trustProxy)
app.use(
  helmet({
    /** API JSON: política mínima; el CSP del SPA lo sirve el host estático (Vite/build). */
    ...(config.nodeEnv === 'production'
      ? {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'none'"],
              baseUri: ["'none'"],
              formAction: ["'none'"],
              frameAncestors: ["'none'"],
            },
          },
        }
      : { contentSecurityPolicy: false }),
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    ...(config.nodeEnv !== 'production' ? { strictTransportSecurity: false } : {}),
  }),
)

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true)
      return
    }
    callback(null, config.corsOrigins.includes(origin))
  },
  credentials: true,
}
app.use(cors(corsOptions))
/** Refinamiento: hasta 10 respuestas × 8000 caracteres + JSON; margen por seguridad. */
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(requestLogger)

app.use('/api/auth', authRoutes)
app.use('/api/ideas', ideasRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/validation', validationRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/semantic', semanticRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use(errorHandler)

app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      nodeEnv: config.nodeEnv,
    },
    'backend server started',
  )
  if (config.nodeEnv === 'production') {
    const onlyLocalhost =
      config.corsOrigins.length > 0 &&
      config.corsOrigins.every(o => /localhost|127\.0\.0\.1/.test(o))
    if (onlyLocalhost) {
      logger.warn(
        { corsOrigins: config.corsOrigins },
        'CORS only allows localhost origins; set CORS_ORIGIN to your production SPA URL(s)',
      )
    }
    if (config.trustProxy === false) {
      logger.warn(
        'TRUST_PROXY is disabled; behind a reverse proxy set TRUST_PROXY=1 (or a hop count) for correct IP-based rate limits',
      )
    }
  }
})
