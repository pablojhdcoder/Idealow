import { publicFlashcardAbsoluteUrl } from '@/lib/publicFlashcardUrl'

const DEFAULT_TITLE = 'Una idea en Idealow'

/** Límite cómodo para X (280) dejando margen con URLs largas. */
const SHARE_TEXT_MAX_CHARS = 278

/** LinkedIn suele ignorar query en shareArticle; el feed con `text` admite más contenido pero no es ilimitado. */
const LINKEDIN_PREFILL_TEXT_MAX = 3000

function baseIdeaTitle(title: string): string {
  return title.trim() || DEFAULT_TITLE
}

function formatTitleChunk(raw: string, maxTitleLen: number): string {
  return raw.length > maxTitleLen ? `${raw.slice(0, Math.max(12, maxTitleLen - 1))}…` : raw
}

/**
 * Línea de copy sin URL + cuerpo completo con URL en párrafo aparte (mejor detección de enlaces en apps).
 */
function shareLineAndFullText(title: string, urlRaw: string): { line: string; fullText: string } {
  const raw = baseIdeaTitle(title)
  const url = urlRaw.trim()

  const make = (maxTitleLen: number) => {
    const t = formatTitleChunk(raw, maxTitleLen)
    const line = `Mira esta idea refinada y validada con IA en Idealow: «${t}».`
    const fullText = `${line}\n\n${url}`
    return { line, fullText }
  }

  let { line, fullText } = make(64)
  if (fullText.length > SHARE_TEXT_MAX_CHARS) {
    ;({ line, fullText } = make(36))
  }
  if (fullText.length > SHARE_TEXT_MAX_CHARS) {
    const lineShort = 'Mira esta idea en Idealow.'
    fullText = `${lineShort}\n\n${url}`
    line = lineShort
  }
  return { line, fullText }
}

/**
 * Texto del compartir con URL en línea propia (WhatsApp, correo, X, LinkedIn feed).
 * Sin espacios pegados al salto de línea antes de la URL para que los clientes la linkifiquen.
 */
export function buildPublicIdeaShareText(params: { title: string; url: string }): string {
  return shareLineAndFullText(params.title, params.url).fullText
}

/**
 * Solo el párrafo descriptivo, sin URL. Útil para Web Share API: el SO suele adjuntar `url` como enlace rico.
 */
export function buildShareMessageLine(params: { title: string; url: string }): string {
  return shareLineAndFullText(params.title, params.url).line
}

export function buildShareEmailSubject(title: string): string {
  const t = title.trim() || 'Idea en Idealow'
  return `Te comparto una idea en Idealow: «${t}»`
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function mailtoShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function twitterIntentUrl(fullMessage: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`
}

/**
 * Abre el compositor del feed con el texto ya rellenado (shareArticle/summary suele ignorarse en la práctica).
 */
export function linkedInFeedPrefillUrl(sharePlainText: string): string {
  const u = new URL('https://www.linkedin.com/feed/')
  u.searchParams.set('shareActive', 'true')
  u.searchParams.set('text', sharePlainText.slice(0, LINKEDIN_PREFILL_TEXT_MAX))
  return u.toString()
}

export type NativeSharePayload = {
  title: string
  text: string
  url: string
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareNative(payload: NativeSharePayload): Promise<void> {
  if (!canUseNativeShare()) {
    throw new Error('navigator.share no disponible')
  }
  await navigator.share({
    title: payload.title,
    text: payload.text,
    url: payload.url,
  })
}

export function buildSharePayloadFromIdea(params: {
  origin: string
  ideaId: string
  title: string
}): NativeSharePayload {
  const url = publicFlashcardAbsoluteUrl(params.origin, params.ideaId)
  const title = params.title.trim() || 'Idea en Idealow'
  return {
    title,
    text: buildShareMessageLine({ title: params.title, url }),
    url,
  }
}
