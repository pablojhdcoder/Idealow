/** Clasificación simple por MIME/nombre para UI de previews. */
export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other'

export function getFileKindFromMime(mimeType: string, originalName: string): FileKind {
  const t = mimeType.toLowerCase()
  const name = originalName.toLowerCase()
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (t.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown')) {
    return 'text'
  }
  return 'other'
}

export function getFileKind(file: File): FileKind {
  const t = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (t.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown')) {
    return 'text'
  }
  return 'other'
}
