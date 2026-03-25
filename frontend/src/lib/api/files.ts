import { parseJsonResponse } from './client'

export async function uploadFile(file: File): Promise<{ fileId: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/files/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  return parseJsonResponse<{ fileId: string }>(res)
}
