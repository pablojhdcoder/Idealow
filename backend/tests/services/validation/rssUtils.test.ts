import { describe, expect, it } from 'vitest'
import { extractRssItemTitles } from '../../../src/services/validation/rssUtils'

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
