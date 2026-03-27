import { APIError } from 'openai'
import { ZodError } from 'zod'
import { config } from '../../config'
import { prisma } from '../../lib/prisma'
import { WHISPER_DEPLOYMENT_MISSING } from '../media/processor'
import { HttpError } from '../../lib/httpError'
import { extractIdea } from '../ai/extractor'
import { processMedia } from '../media/processor'
import { scheduleFileEmbedding, scheduleIdeaEmbedding } from '../embeddings/embeddingJob'

export type CreateIdeaInput = {
  userId: string
  content?: string
  fileId?: string
  fileIds?: string[]
  sector?: string
}

export type CreateIdeaResult = {
  ideaId: string
  extracted: Awaited<ReturnType<typeof extractIdea>>
  nextStep: 'refine'
}

/** Evita payloads enormes a Azure (context / coste). El resto se descarta para extracción. */
const MAX_RAW_TEXT_CHARS_FOR_EXTRACTION = 100_000
/** Texto persistido en File.sourceText y para embeddings de archivo. */
const MAX_SOURCE_TEXT_CHARS = 50_000

/**
 * Orquesta: resolver texto (contenido directo o uno/varios archivos), extraer idea con IA y persistir.
 */
export async function createIdeaFromInput(input: CreateIdeaInput): Promise<CreateIdeaResult> {
  const { userId, content, fileId, fileIds, sector } = input

  const mergedIds = [...new Set([...(fileIds ?? []), ...(fileId ? [fileId] : [])])]

  const fromContent = (content ?? '').trim()
  const fromFiles: string[] = []

  for (const id of mergedIds) {
    const file = await prisma.file.findFirst({ where: { id, userId } })
    if (!file) {
      throw new HttpError(404, 'File not found', 'IDEAS_FILE_NOT_FOUND')
    }
    if (file.ideaId != null) {
      throw new HttpError(
        409,
        'File is already attached to an idea',
        'IDEAS_FILE_ALREADY_ATTACHED',
      )
    }
    try {
      const extractedText = (await processMedia(file.filepath, file.mimeType)).trim()
      fromFiles.push(extractedText)
      const sourceText =
        extractedText.length > MAX_SOURCE_TEXT_CHARS
          ? extractedText.slice(0, MAX_SOURCE_TEXT_CHARS)
          : extractedText
      await prisma.file.update({
        where: { id },
        data: { sourceText },
      })
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('UNSUPPORTED_MEDIA:')) {
        throw new HttpError(
          422,
          e.message.replace('UNSUPPORTED_MEDIA:', '').trim(),
          'IDEAS_UNSUPPORTED_MEDIA',
        )
      }
      if (e instanceof Error && e.message === WHISPER_DEPLOYMENT_MISSING) {
        throw new HttpError(
          503,
          'Audio transcription is not configured (set AZURE_OPENAI_DEPLOYMENT_WHISPER)',
          'IDEAS_WHISPER_NOT_CONFIGURED',
        )
      }
      if (e instanceof APIError) {
        throw new HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'IDEAS_AI_PROVIDER_ERROR')
      }
      throw e
    }
  }

  const rawTextJoined = [fromContent, ...fromFiles].filter(Boolean).join('\n\n')
  const rawText =
    rawTextJoined.length > MAX_RAW_TEXT_CHARS_FOR_EXTRACTION
      ? rawTextJoined.slice(0, MAX_RAW_TEXT_CHARS_FOR_EXTRACTION)
      : rawTextJoined

  if (!rawText.trim()) {
    throw new HttpError(422, 'No content provided', 'IDEAS_NO_CONTENT')
  }

  let extracted: Awaited<ReturnType<typeof extractIdea>>
  try {
    extracted = await extractIdea(rawText, sector)
  } catch (e) {
    if (e instanceof ZodError) {
      throw new HttpError(
        502,
        'Idea extraction failed: invalid AI response',
        'IDEAS_AI_INVALID_RESPONSE',
        config.nodeEnv === 'development' ? e.flatten() : undefined,
      )
    }
    if (e instanceof Error && e.message === 'Extractor returned non-JSON response') {
      throw new HttpError(
        502,
        'Idea extraction failed: model did not return JSON',
        'IDEAS_AI_NON_JSON_RESPONSE',
      )
    }
    if (e instanceof APIError) {
      throw new HttpError(502, `Microsoft Foundry / Azure OpenAI error: ${e.message}`, 'IDEAS_AI_PROVIDER_ERROR')
    }
    throw e
  }

  const idea = await prisma.idea.create({
    data: {
      userId,
      title: extracted.title,
      summary: extracted.elevator_pitch,
      rawContent: rawText,
      sector: extracted.sector || sector,
      status: 'DRAFT',
      /** Base para el wizard de refinamiento (mismos campos que devuelve el extractor). */
      refinedContent: { ...extracted },
      files:
        mergedIds.length > 0 ? { connect: mergedIds.map((id: string) => ({ id })) } : undefined,
    },
  })

  scheduleIdeaEmbedding(idea.id)
  for (const fid of mergedIds) {
    scheduleFileEmbedding(fid)
  }

  return {
    ideaId: idea.id,
    extracted,
    nextStep: 'refine',
  }
}
