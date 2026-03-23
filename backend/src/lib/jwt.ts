import jwt from 'jsonwebtoken'
import { config } from '../config'

export const signToken = (userId: string) =>
  jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })

export const verifyToken = (token: string) =>
  jwt.verify(token, config.jwtSecret) as { userId: string }
