/**
 * Ruta y URL del enlace público de una idea (vista teaser / detalle en `/flashcard/:id`).
 */
export function publicFlashcardPath(ideaId: string): string {
  return `/flashcard/${encodeURIComponent(ideaId)}`
}

export function publicFlashcardAbsoluteUrl(origin: string, ideaId: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}${publicFlashcardPath(ideaId)}`
}
