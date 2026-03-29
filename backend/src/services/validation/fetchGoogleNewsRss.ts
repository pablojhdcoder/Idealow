import axios from 'axios'
import { logger } from '../../lib/logger'
import { extractRssItems, type RssItemRef } from './rssUtils'

export type GoogleNewsRssLocale = { hl: string; gl: string; ceid: string }

/** Google suele devolver HTML vacío o bloquear UAs minimalistas; imitar navegador mejora mucho el RSS. */
const RSS_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function looksLikeNewsRssXml(body: string): boolean {
  const s = body.slice(0, 2000).toLowerCase()
  return s.includes('<rss') || s.includes('<feed') || s.includes('<item')
}

export async function fetchGoogleNewsItems(
  searchQuery: string,
  limit = 18,
  locale?: GoogleNewsRssLocale,
): Promise<RssItemRef[]> {
  const q = searchQuery.trim().slice(0, 280)
  if (!q) {
    return []
  }
  const hl = locale?.hl ?? 'es'
  const gl = locale?.gl ?? 'ES'
  const ceid = locale?.ceid ?? 'ES:es'
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`
  try {
    const { data } = await axios.get<string>(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': RSS_BROWSER_UA,
        Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9,*/*;q=0.8',
        'Accept-Language': `${hl === 'es' ? 'es-ES,es;q=0.9' : 'en-US,en;q=0.9'}`,
      },
      responseType: 'text',
    })
    const xml = typeof data === 'string' ? data : String(data)
    if (!looksLikeNewsRssXml(xml)) {
      logger.warn(
        { q: q.slice(0, 80), preview: xml.slice(0, 200).replace(/\s+/g, ' ') },
        'Google News RSS: respuesta no parece XML/RSS',
      )
      return []
    }
    return extractRssItems(xml, limit)
  } catch (e) {
    logger.warn({ err: e, q: q.slice(0, 80) }, 'Google News RSS fetch failed')
    return []
  }
}

export type NewsRssAttempt = { query: string; locale?: GoogleNewsRssLocale }

/**
 * Varias consultas en secuencia (más cortas y/o otro mercado) hasta llenar `limitTotal`.
 * Google a menudo devuelve 0 ítems con consultas muy largas o demasiado específicas.
 */
export async function fetchGoogleNewsItemsWithFallbacks(
  attempts: NewsRssAttempt[],
  limitTotal = 24,
): Promise<RssItemRef[]> {
  const seenUrl = new Set<string>()
  const merged: RssItemRef[] = []
  for (const { query, locale } of attempts) {
    if (merged.length >= limitTotal) break
    const need = limitTotal - merged.length
    const batch = await fetchGoogleNewsItems(query, Math.min(20, need), locale)
    for (const it of batch) {
      if (seenUrl.has(it.url)) continue
      seenUrl.add(it.url)
      merged.push(it)
    }
    if (merged.length >= 10) break
    await new Promise(r => setTimeout(r, 120))
  }
  return merged
}

export async function fetchGoogleNewsTitles(
  searchQuery: string,
  limit = 18,
): Promise<string[]> {
  const items = await fetchGoogleNewsItems(searchQuery, limit)
  return items.map(i => i.title)
}
