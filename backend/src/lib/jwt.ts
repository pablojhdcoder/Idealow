import jwt from 'jsonwebtoken'
import { config } from '../config'

export const signToken = (userId: string) =>
  jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: '7d',
    algorithm: 'HS256',
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  })

export const verifyToken = (token: string) => {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }) as { userId?: unknown }

  if (typeof payload.userId !== 'string' || payload.userId.trim().length === 0) {
    throw new Error('Invalid token payload')
  }

  return { userId: payload.userId }
}
