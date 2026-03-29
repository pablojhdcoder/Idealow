import { describe, expect, it, beforeEach } from 'vitest'
import {
  consumePostAuthReturn,
  peekPostAuthReturn,
  rememberPostAuthReturn,
  sanitizePostAuthReturnPath,
} from '@/lib/postAuthRedirect'

describe('sanitizePostAuthReturnPath', () => {
  it('acepta ruta interna con query', () => {
    expect(sanitizePostAuthReturnPath('/flashcard/x?full=1')).toBe('/flashcard/x?full=1')
  })

  it('rechaza open redirect', () => {
    expect(sanitizePostAuthReturnPath('//evil.com')).toBeNull()
    expect(sanitizePostAuthReturnPath('https://evil.com')).toBeNull()
  })

  it('rechaza path traversal', () => {
    expect(sanitizePostAuthReturnPath('/../admin')).toBeNull()
  })
})

describe('rememberPostAuthReturn / consumePostAuthReturn', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('consume elimina la clave', () => {
    rememberPostAuthReturn('/flashcard/a?full=1')
    expect(consumePostAuthReturn()).toBe('/flashcard/a?full=1')
    expect(consumePostAuthReturn()).toBeNull()
  })

  it('peek no elimina la clave', () => {
    rememberPostAuthReturn('/flashcard/b')
    expect(peekPostAuthReturn()).toBe('/flashcard/b')
    expect(peekPostAuthReturn()).toBe('/flashcard/b')
    consumePostAuthReturn()
  })
})
