import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config'
import authRoutes from './routes/auth'
import ideasRoutes from './routes/ideas'
import validationRoutes from './routes/validation'
import usersRoutes from './routes/users'
import feedRoutes from './routes/feed'
import filesRoutes from './routes/files'
import { errorHandler } from './middleware/errors'
import { requestLogger } from './middleware/requestLogger'
import { logger } from './lib/logger'

const app = express()

app.set('trust proxy', config.trustProxy)
app.use(helmet())
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(requestLogger)

app.use('/api/auth', authRoutes)
app.use('/api/ideas', ideasRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/validation', validationRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/feed', feedRoutes)

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
