import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { config } from '../../src/config'
import { signToken, verifyToken } from '../../src/lib/jwt'

describe('JWT hardening', () => {
  it('firma y verifica con issuer/audience/algoritmo esperados', () => {
    const token = signToken('user-123')

    const decoded = jwt.decode(token, { complete: true }) as {
      header?: { alg?: string }
      payload?: { iss?: string; aud?: string | string[] }
    }
    const payload = verifyToken(token)

    expect(decoded.header?.alg).toBe('HS256')
    expect(decoded.payload?.iss).toBe(config.jwtIssuer)
    expect(decoded.payload?.aud).toBe(config.jwtAudience)
    expect(payload).toEqual({ userId: 'user-123' })
  })

  it('rechaza token con audience invalido', () => {
    const token = jwt.sign({ userId: 'user-123' }, config.jwtSecret, {
      expiresIn: '7d',
      algorithm: 'HS256',
      issuer: config.jwtIssuer,
      audience: 'otro-audience',
    })

    expect(() => verifyToken(token)).toThrow()
  })
})
