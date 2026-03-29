import { describe, expect, it } from 'vitest'
import {
  buildPublicIdeaShareText,
  buildShareEmailSubject,
  buildSharePayloadFromIdea,
  linkedInFeedPrefillUrl,
  mailtoShareUrl,
  twitterIntentUrl,
  whatsAppShareUrl,
} from '@/lib/sharePublicIdea'

describe('buildPublicIdeaShareText', () => {
  it('mensaje corto unificado: título, copy e URL', () => {
    const s = buildPublicIdeaShareText({ title: 'Mi idea', url: 'https://x.com/f/1' })
    expect(s).toContain('Mi idea')
    expect(s).toContain('Idealow')
    expect(s).toMatch(/Mira esta idea/)
    expect(s).toContain('https://x.com/f/1')
  })

  it('cabe en ~280 caracteres con URL típica', () => {
    const s = buildPublicIdeaShareText({
      title: 'Título medio de prueba',
      url: 'https://app.example.com/flashcard/550e8400-e29b-41d4-a716-446655440000',
    })
    expect(s.length).toBeLessThanOrEqual(278)
  })

  it('usa título por defecto si viene vacío', () => {
    const s = buildPublicIdeaShareText({ title: '   ', url: 'https://x.com/f/1' })
    expect(s).toContain('Una idea en Idealow')
    expect(s).toContain('https://x.com/f/1')
  })
})

describe('buildShareEmailSubject', () => {
  it('incluye el título', () => {
    expect(buildShareEmailSubject('Título')).toContain('Título')
    expect(buildShareEmailSubject('Título')).toContain('Idealow')
  })
})

describe('share URL builders', () => {
  it('whatsapp codifica el texto', () => {
    const u = whatsAppShareUrl('hola & adiós')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(u.split('text=')[1]!)).toBe('hola & adiós')
  })

  it('mailto incluye asunto y cuerpo', () => {
    const u = mailtoShareUrl('Asunto', 'Cuerpo')
    expect(u.startsWith('mailto:?')).toBe(true)
    expect(u).toContain(encodeURIComponent('Asunto'))
    expect(u).toContain(encodeURIComponent('Cuerpo'))
  })

  it('twitter intent codifica el mensaje completo', () => {
    const u = twitterIntentUrl('texto\nhttps://u')
    expect(u.startsWith('https://twitter.com/intent/tweet?text=')).toBe(true)
  })

  it('linkedin feed prefill incluye shareActive y el texto', () => {
    const u = linkedInFeedPrefillUrl('Cuerpo compartido\nhttps://a.com/x')
    expect(u.startsWith('https://www.linkedin.com/feed')).toBe(true)
    expect(u).toContain('shareActive=true')
    expect(decodeURIComponent(new URL(u).searchParams.get('text') ?? '')).toBe(
      'Cuerpo compartido\nhttps://a.com/x',
    )
  })
})

describe('buildSharePayloadFromIdea', () => {
  it('separa texto y URL para Web Share (texto sin http)', () => {
    const p = buildSharePayloadFromIdea({
      origin: 'https://app.test',
      ideaId: 'id-1',
      title: 'T',
    })
    expect(p.url).toBe('https://app.test/flashcard/id-1')
    expect(p.title).toBe('T')
    expect(p.text).toContain('T')
    expect(p.text).not.toContain('http')
    expect(p.text).toMatch(/Mira esta idea/)
  })
})
