/**
 * Redirección tras login/registro/onboarding: solo rutas internas relativas (anti open-redirect).
 */
const STORAGE_KEY = 'idealow:postAuthReturn'

export function sanitizePostAuthReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('/') || s.startsWith('//')) return null
  if (s.includes('..')) return null
  if (s.length > 512) return null
  return s
}

/** Guarda destino para recuperarlo tras onboarding (p. ej. si se pierde location.state). */
export function rememberPostAuthReturn(path: string | null): void {
  if (path) {
    sessionStorage.setItem(STORAGE_KEY, path)
  } else {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function peekPostAuthReturn(): string | null {
  return sanitizePostAuthReturnPath(sessionStorage.getItem(STORAGE_KEY))
}

export function consumePostAuthReturn(): string | null {
  const v = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  return sanitizePostAuthReturnPath(v)
}
