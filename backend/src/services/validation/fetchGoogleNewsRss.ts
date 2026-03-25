import axios from 'axios'
import { logger } from '../../lib/logger'
import { extractRssItemTitles } from './rssUtils'

export async function fetchGoogleNewsTitles(
  searchQuery: string,
  limit = 18,
): Promise<string[]> {
  const q = searchQuery.trim().slice(0, 280)
  if (!q) {
    return []
  }
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es&gl=ES&ceid=ES:es`
  try {
    const { data } = await axios.get<string>(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Idealow/1.0 (market-validation; +https://idealow.app)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    })
    return extractRssItemTitles(typeof data === 'string' ? data : String(data), limit)
  } catch (e) {
    logger.warn({ err: e, q: q.slice(0, 80) }, 'Google News RSS fetch failed')
    return []
  }
}
