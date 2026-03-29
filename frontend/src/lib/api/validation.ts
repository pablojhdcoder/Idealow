import { parseJsonResponse } from './client'

export type StartValidationResponse = {
  status: 'started' | 'already_validated'
  ideaId: string
}

export async function postStartValidation(ideaId: string): Promise<StartValidationResponse> {
  const res = await fetch(
    `/api/validation/ideas/${encodeURIComponent(ideaId)}/validate`,
    {
      method: 'POST',
      credentials: 'include',
    },
  )
  return parseJsonResponse<StartValidationResponse>(res)
}

export function validationStreamUrl(ideaId: string): string {
  const path = `/api/validation/ideas/${encodeURIComponent(ideaId)}/validate/stream`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return path
}
