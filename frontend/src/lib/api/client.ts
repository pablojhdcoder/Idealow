export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type ErrorBody = {
  error?: string
  code?: string
  details?: unknown
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body: unknown = isJson ? await res.json().catch(() => ({})) : {}

  if (!res.ok) {
    const err = body as ErrorBody
    const message = err.error?.trim() || res.statusText || 'Request failed'
    throw new ApiError(res.status, message, err.code, err.details)
  }

  return body as T
}
