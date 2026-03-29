import { describe, expect, it } from 'vitest'
import { hydrateValidationSnapshot } from '@/lib/hydrateValidationSnapshot'

describe('hydrateValidationSnapshot — social / YouTube', () => {
  it('reconstruye muestras youtube_long_samples desde validationData', () => {
    const raw = {
      validation_score: 72,
      verdict: 'MODERATE_SIGNAL',
      recommendation: 'Test',
      social: {
        score: 80,
        summary: 'Resumen de YouTube y redes.',
        youtube_long_count: 5,
        youtube_shorts_count: 5,
        explore_query: 'pets vet',
        youtube_long_samples: [
          { videoId: 'abc123', title: 'Título vídeo', channelTitle: 'Canal' },
        ],
        youtube_shorts_samples: [{ videoId: 'xyz', title: 'Short', channelTitle: 'S' }],
        ai_social_search: {},
      },
    }
    const state = hydrateValidationSnapshot(raw)
    expect(state).not.toBeNull()
    expect(state!.social.youtubeLongSamples).toHaveLength(1)
    expect(state!.social.youtubeLongSamples?.[0]?.videoId).toBe('abc123')
    expect(state!.social.youtubeShortSamples).toHaveLength(1)
    expect(state!.social.summary).toBe('Resumen de YouTube y redes.')
    expect(state!.social.youtubeLongCount).toBe(5)
    expect(state!.social.youtubeShortsCount).toBe(5)
  })
})
