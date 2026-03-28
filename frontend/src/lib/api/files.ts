import { ApiError, parseJsonResponse } from './client'

export class UploadFileError extends Error {
  readonly fileName: string

  constructor(fileName: string, message: string) {
    super(message)
    this.name = 'UploadFileError'
    this.fileName = fileName
  }
}

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

async function abandonOrphanFileUploads(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return
  const res = await fetch('/api/files/abandon-uploads', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds }),
  })
  await parseJsonResponse(res)
}

/**
 * Sube varios archivos en orden. Si uno falla, revierte en servidor los ya subidos (huérfanos).
 */
export async function uploadAttachedFilesForIdea(files: File[]): Promise<string[]> {
  const fileIds: string[] = []
  for (const file of files) {
    try {
      const { fileId } = await uploadFile(file)
      fileIds.push(fileId)
    } catch (e) {
      if (fileIds.length > 0) {
        try {
          await abandonOrphanFileUploads(fileIds)
        } catch {
          // El error relevante es el de la subida que falló
        }
      }
      const detail =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error desconocido'
      throw new UploadFileError(file.name, `No se pudo subir «${file.name}»: ${detail}`)
    }
  }
  return fileIds
}
