import { describe, expect, it } from 'vitest'
import { extractRssItemTitles, extractRssItems } from '../../../src/services/validation/rssUtils'

describe('extractRssItemTitles', () => {
  it('extrae titulos de items RSS', () => {
    const xml = `<?xml version="1.0"?><rss><channel><title>Feed</title>
      <item><title><![CDATA[Primera noticia]]></title></item>
      <item><title>Segunda &amp; más</title></item>
    </channel></rss>`
    const t = extractRssItemTitles(xml, 10)
    expect(t).toContain('Primera noticia')
    expect(t.some(x => x.includes('Segunda'))).toBe(true)
  })
})

describe('extractRssItems', () => {
  it('extrae titulo y enlace por item', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[Noticia con link]]></title>
        <link>https://news.google.com/articles/abc</link>
      </item>
    </channel></rss>`
    const items = extractRssItems(xml, 5)
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Noticia con link')
    expect(items[0]?.url).toBe('https://news.google.com/articles/abc')
  })

  it('usa guid como URL si link no es http', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Test</title>
        <link></link>
        <guid>https://example.com/story/1</guid>
      </item>
    </channel></rss>`
    const items = extractRssItems(xml, 5)
    expect(items).toHaveLength(1)
    expect(items[0]?.url).toBe('https://example.com/story/1')
  })
})
