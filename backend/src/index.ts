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
    contentSecurityPolicy: false,
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
app.use(express.json())
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
})
