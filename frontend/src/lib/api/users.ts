import { parseJsonResponse } from '@/lib/api/client'

export type PatchProfileBody = {
  sectors?: string[]
  experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'PROFESSIONAL'
  goal?: 'HACKATHON' | 'SIDE_PROJECT' | 'STARTUP' | 'LEARNING'
  /** Solo `/api/files/{uuid}` devuelto por el backend o cadena vacía para limpiar. */
  avatarUrl?: '' | string
  avatarFileId?: string
  username?: string
  email?: string
}

export type ProfileUserResponse = {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  sectors: string[]
  goal: string
  experienceLevel?: string
}

export async function patchProfile(
  body: PatchProfileBody,
): Promise<{ user: ProfileUserResponse }> {
  const res = await fetch('/api/users/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return parseJsonResponse<{ user: ProfileUserResponse }>(res)
}

export async function changePassword(body: {
  currentPassword: string
  newPassword: string
}): Promise<{ success: boolean }> {
  const res = await fetch('/api/users/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return parseJsonResponse<{ success: boolean }>(res)
}

export async function generateIdeaSuggestionFromProfile(): Promise<{ content: string }> {
  const res = await fetch('/api/users/suggestions/generate', {
    method: 'POST',
    credentials: 'include',
  })
  return parseJsonResponse<{ content: string }>(res)
}
