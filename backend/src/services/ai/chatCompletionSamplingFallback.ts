import { APIError, type AzureOpenAI } from 'openai'
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions'

function errorText(error: unknown): string {
  if (!(error instanceof APIError)) return ''
  const body = error.error as { message?: string; param?: string } | undefined
  return `${error.message}\n${body?.message ?? ''}\n${body?.param ?? ''}`.toLowerCase()
}

/** 400 por parámetros de muestreo no soportados (p. ej. modelos de razonamiento en Azure). */
export function isUnsupportedSamplingParameterError(error: unknown): boolean {
  if (!(error instanceof APIError) || error.status !== 400) return false
  const t = errorText(error)
  return (
    t.includes('temperature') ||
    t.includes('top_p') ||
    t.includes('frequency_penalty') ||
    t.includes('presence_penalty')
  )
}

export async function chatCompletionsCreateWithSamplingFallback(
  client: AzureOpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<ChatCompletion> {
  try {
    return await client.chat.completions.create(params)
  } catch (e) {
    if (!isUnsupportedSamplingParameterError(e)) {
      throw e
    }
    const {
      temperature: _temp,
      top_p: _topP,
      frequency_penalty: _fp,
      presence_penalty: _pp,
      ...rest
    } = params
    return await client.chat.completions.create(rest)
  }
}
