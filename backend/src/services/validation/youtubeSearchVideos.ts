import axios from 'axios'
import { config } from '../../config'
import { logger } from '../../lib/logger'

type YoutubeSearchItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

/** YouTube Data API v3 (`search.list`) — https://developers.google.com/youtube/v3 */
export async function youtubeSearchVideos(
  keywords: string[],
  opts?: { videoDuration?: 'short' | 'medium' | 'long' },
): Promise<{ count: number; titles: string[] }> {
  const key = config.youtubeApiKey.trim()
  if (!key) {
    return { count: 0, titles: [] }
  }
  const q =
    opts?.videoDuration === 'short'
      ? `${keywords.slice(0, 4).join(' ')} shorts`.trim() || 'shorts'
      : keywords.slice(0, 5).join(' ').trim() || 'startup'
  try {
    const { data } = await axios.get<{ items?: YoutubeSearchItem[] }>(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          type: 'video',
          maxResults: 10,
          q,
          key,
          ...(opts?.videoDuration ? { videoDuration: opts.videoDuration } : {}),
        },
        timeout: 12000,
      },
    )
    const items = data.items ?? []
    return {
      count: items.length,
      titles: items
        .map(i => i.snippet?.title)
        .filter((t): t is string => typeof t === 'string')
        .slice(0, 8),
    }
  } catch (e) {
    logger.warn({ err: e, videoDuration: opts?.videoDuration }, 'YouTube search failed')
    return { count: 0, titles: [] }
  }
}
