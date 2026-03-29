/**
 * URL de favicon vía API pública de Google (sin clave). Úsala como preview de dominio del enlace.
 */
export function faviconUrlFromHref(href: string, size = 64): string | null {
  try {
    const u = new URL(href)
    if (!u.protocol.startsWith('http') || !u.hostname) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=${String(size)}`
  } catch {
    return null
  }
}
