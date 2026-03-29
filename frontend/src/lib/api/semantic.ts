import type { IdeaSummary } from '@/types/idea'
import type { IdeaFlashcard } from '@/types/flashcard'
import { parseJsonResponse } from './client'

export async function semanticSearchIdeas(params: {
  q: string
  limit?: number
}): Promise<{ ideas: IdeaSummary[] }> {
  const qs = new URLSearchParams({ q: params.q })
  if (params.limit != null) {
    qs.set('limit', String(params.limit))
  }
  const res = await fetch(`/api/semantic/search?${qs.toString()}`, { credentials: 'include' })
  return parseJsonResponse<{ ideas: IdeaSummary[] }>(res)
}

export async function fetchSimilarIdeas(
  ideaId: string,
  limit?: number,
): Promise<{ ideas: IdeaSummary[] }> {
  const qs =
    limit != null
      ? `?${new URLSearchParams({ limit: String(limit) }).toString()}`
      : ''
  const res = await fetch(
    `/api/ideas/${encodeURIComponent(ideaId)}/similar${qs}`,
    { credentials: 'include' },
  )
  return parseJsonResponse<{ ideas: IdeaSummary[] }>(res)
}

/** Ideas publicadas en la comunidad similares por embedding a una idea tuya. */
export async function fetchSimilarCommunityFeed(
  ideaId: string,
  limit?: number,
): Promise<{ items: IdeaFlashcard[] }> {
  const qs =
    limit != null
      ? `?${new URLSearchParams({ limit: String(limit) }).toString()}`
      : ''
  const res = await fetch(
    `/api/ideas/${encodeURIComponent(ideaId)}/similar-feed${qs}`,
    { credentials: 'include' },
  )
  return parseJsonResponse<{ items: IdeaFlashcard[] }>(res)
}
