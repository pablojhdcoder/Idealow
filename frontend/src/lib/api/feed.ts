import type { IdeaFlashcard } from '@/types/flashcard'
import { parseJsonResponse } from './client'

export type FeedSort = 'new' | 'score' | 'votes'
export type FeedFilter = 'all' | 'strong'

export type FetchFeedParams = {
  cursor?: string
  limit?: number
  sector?: string
  sort?: FeedSort
  filter?: FeedFilter
  q?: string
  page?: number
}

export type FeedResponse = {
  items: IdeaFlashcard[]
  nextCursor: string | null
  nextPage: number | null
}

export async function fetchFeed(params: FetchFeedParams = {}): Promise<FeedResponse> {
  const qs = new URLSearchParams()
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.sector) qs.set('sector', params.sector)
  if (params.sort) qs.set('sort', params.sort)
  if (params.filter) qs.set('filter', params.filter)
  if (params.q?.trim()) qs.set('q', params.q.trim())
  if (params.page != null) qs.set('page', String(params.page))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await fetch(`/api/feed${suffix}`, { credentials: 'include' })
  return parseJsonResponse<FeedResponse>(res)
}
