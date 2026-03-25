import pino from 'pino'
import { config } from '../config'

const isProduction = config.nodeEnv === 'production'

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: {
    service: 'backend',
    env: config.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'authorization',
      'token',
      'password',
      '*.password',
      '*.apiKey',
      '*.secret',
      '*.jwt',
    ],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
})
