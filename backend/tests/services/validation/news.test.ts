import { describe, expect, it } from 'vitest'
import { linkHeadlinesToRss } from '../../../src/services/validation/news'

describe('linkHeadlinesToRss', () => {
  const items = [
    { title: 'Startup funding slows in Europe this quarter', url: 'https://news.example/a' },
    { title: 'AI tools reshape small business workflows', url: 'https://news.example/b' },
  ]

  it('empareja titular exacto', () => {
    const out = linkHeadlinesToRss(['AI tools reshape small business workflows'], items)
    expect(out).toEqual([
      { title: 'AI tools reshape small business workflows', url: 'https://news.example/b' },
    ])
  })

  it('empareja por solapamiento de tokens cuando el modelo parafrasea poco', () => {
    const out = linkHeadlinesToRss(['Europe startup funding news quarter'], items)
    expect(out[0]?.url).toBe('https://news.example/a')
  })
})
