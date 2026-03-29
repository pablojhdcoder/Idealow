function decodeXmlText(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/** Extrae títulos de ítems RSS/Atom sin dependencias XML (Google News RSS). */
export function extractRssItemTitles(xml: string, limit = 20): string[] {
  const titles: string[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []
  for (const block of itemBlocks) {
    if (titles.length >= limit) break
    const m = block.match(
      /<title(?:[^>]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/i,
    )
    if (!m) continue
    const raw = (m[1] ?? m[2] ?? '').trim()
    const plain = decodeXmlText(raw.replace(/<[^>]+>/g, '').trim())
    if (plain.length > 2) {
      titles.push(plain)
    }
  }
  return titles
}

export type RssItemRef = { title: string; url: string }

/** Título + enlace por ítem (Google News incluye `<link>` por noticia). */
export function extractRssItems(xml: string, limit = 20): RssItemRef[] {
  const out: RssItemRef[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []
  for (const block of itemBlocks) {
    if (out.length >= limit) break
    const tm = block.match(
      /<title(?:[^>]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/i,
    )
    if (!tm) continue
    const rawTitle = (tm[1] ?? tm[2] ?? '').trim()
    const plainTitle = decodeXmlText(rawTitle.replace(/<[^>]+>/g, '').trim())
    if (plainTitle.length < 3) continue

    const lm = block.match(/<link(?:[^>]*)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/link>/i)
    let rawUrl = (lm?.[1] ?? lm?.[2] ?? '').trim()
    let url = decodeXmlText(rawUrl.replace(/<[^>]+>/g, '').trim())
    if (!url.startsWith('http')) {
      const gm = block.match(
        /<guid(?:\s[^>]*)?>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/guid>/i,
      )
      const rawG = (gm?.[1] ?? gm?.[2] ?? '').trim()
      url = decodeXmlText(rawG.replace(/<[^>]+>/g, '').trim())
    }
    if (!url.startsWith('http')) continue

    out.push({ title: plainTitle, url })
  }
  return out
}
