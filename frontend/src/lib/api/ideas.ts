import type { RefinedIdeaFields } from '@/lib/refinedIdeaPayload'
import type {
  ConfirmRefinementResponse,
  CreateIdeaResponse,
  IdeaSummary,
  RefinementQuestionsResponse,
  RefineAnswersPayload,
  SubmitRefinementResponse,
} from '@/types/idea'
import type { FeedbackComment, IdeaFlashcardDetailResponse } from '@/types/flashcard'
import { parseJsonResponse } from './client'

export async function listIdeas(
  params?: { cursor?: string; limit?: number },
): Promise<{ ideas: IdeaSummary[]; nextCursor: string | null }> {
  const qs =
    params && (params.cursor != null || params.limit != null)
      ? `?${new URLSearchParams({
          ...(params.cursor != null ? { cursor: params.cursor } : {}),
          ...(params.limit != null ? { limit: String(params.limit) } : {}),
        }).toString()}`
      : ''
  const res = await fetch(`/api/ideas${qs}`, { credentials: 'include' })
  return parseJsonResponse<{ ideas: IdeaSummary[]; nextCursor: string | null }>(res)
}

export type CreateIdeaBody = {
  content?: string
  /** @deprecated usar fileIds cuando hay varios; el backend acepta ambos */
  fileId?: string
  fileIds?: string[]
  sector?: string
  /** Por defecto el servidor asume true si se omite. */
  isPublished?: boolean
}

export async function createIdea(body: CreateIdeaBody): Promise<CreateIdeaResponse> {
  const res = await fetch('/api/ideas', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJsonResponse<CreateIdeaResponse>(res)
}

export async function requestRefineQuestions(ideaId: string): Promise<RefinementQuestionsResponse> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/refine/questions`, {
    method: 'POST',
    credentials: 'include',
  })
  return parseJsonResponse<RefinementQuestionsResponse>(res)
}

export async function submitRefineAnswers(
  ideaId: string,
  answers: RefineAnswersPayload,
): Promise<SubmitRefinementResponse> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/refine/answers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  })
  return parseJsonResponse<SubmitRefinementResponse>(res)
}

export async function submitRefineConfirm(
  ideaId: string,
  refined: RefinedIdeaFields,
): Promise<ConfirmRefinementResponse> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/refine/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refined),
  })
  return parseJsonResponse<ConfirmRefinementResponse>(res)
}

export async function fetchIdeaFlashcardDetail(ideaId: string): Promise<IdeaFlashcardDetailResponse> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}`, { credentials: 'include' })
  return parseJsonResponse<IdeaFlashcardDetailResponse>(res)
}

export async function patchIdeaPublish(
  ideaId: string,
  isPublished: boolean,
): Promise<{ id: string; isPublished: boolean; publishedAt: string | null }> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublished }),
  })
  return parseJsonResponse(res)
}

export async function fetchIdeaFeedbackComments(
  ideaId: string,
  params?: { cursor?: string; limit?: number },
): Promise<{ comments: FeedbackComment[]; nextCursor: string | null }> {
  const qs = new URLSearchParams()
  if (params?.cursor) qs.set('cursor', params.cursor)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await fetch(
    `/api/ideas/${encodeURIComponent(ideaId)}/feedback${suffix}`,
    { credentials: 'include' },
  )
  return parseJsonResponse(res)
}

export async function postIdeaFeedback(
  ideaId: string,
  body: { vote: 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL'; comment?: string },
): Promise<{ ok: true; vote: string; comment: string | null }> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJsonResponse(res)
}
