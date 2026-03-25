export function stripMarkdownCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = stripMarkdownCodeFence(raw)
  try {
    const v = JSON.parse(cleaned) as unknown
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
  } catch {
    /* fallthrough */
  }
  return {}
}

export function parseJsonArray(raw: string): unknown[] {
  const cleaned = stripMarkdownCodeFence(raw)
  try {
    const v = JSON.parse(cleaned) as unknown
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
