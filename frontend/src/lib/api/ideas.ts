import type {
  CreateIdeaResponse,
  IdeaSummary,
  RefinementQuestionsResponse,
  RefineAnswersPayload,
  SubmitRefinementResponse,
} from '@/types/idea'
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
