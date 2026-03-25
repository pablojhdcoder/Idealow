type ContentPart = { type?: string; text?: string }

/** Normaliza `message.content` (string o lista de partes del SDK). */
export function completionContentToPlainText(content: unknown): string {
  if (content == null) {
    return ''
  }
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return (content as ContentPart[])
    .map((part) => (part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .join('')
}
