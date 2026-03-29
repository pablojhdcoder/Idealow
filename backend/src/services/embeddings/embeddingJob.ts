import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { hasEmbeddingsConfig } from '../../config'
import { buildEmbeddingTextForIdea } from './textForIdea'
import { generateEmbedding } from './generateEmbedding'

const ideaInFlight = new Set<string>()
const fileInFlight = new Set<string>()

async function persistIdeaVector(ideaId: string, vector: number[]): Promise<void> {
  const v = JSON.stringify(vector)
  await prisma.$executeRaw`
    UPDATE "Idea" SET embedding = ${v}::vector WHERE id = ${ideaId}
  `
}

async function persistFileVector(fileId: string, vector: number[]): Promise<void> {
  const v = JSON.stringify(vector)
  await prisma.$executeRaw`
    UPDATE "File" SET embedding = ${v}::vector WHERE id = ${fileId}
  `
}

export function scheduleIdeaEmbedding(ideaId: string): void {
  if (!hasEmbeddingsConfig()) {
    logger.debug({ ideaId }, 'skip idea embedding: embeddings deployment not configured')
    return
  }
  void runIdeaEmbeddingJob(ideaId).catch(err => {
    logger.warn({ ideaId, err }, 'idea embedding job failed')
  })
}

async function runIdeaEmbeddingJob(ideaId: string): Promise<void> {
  if (ideaInFlight.has(ideaId)) {
    return
  }
  ideaInFlight.add(ideaId)
  try {
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, title: true, summary: true, refinedContent: true },
    })
    if (!idea) {
      return
    }
    const text = buildEmbeddingTextForIdea(idea)
    if (!text.trim()) {
      return
    }
    const vector = await generateEmbedding(text)
    await persistIdeaVector(ideaId, vector)
  } finally {
    ideaInFlight.delete(ideaId)
  }
}

export function scheduleFileEmbedding(fileId: string): void {
  if (!hasEmbeddingsConfig()) {
    return
  }
  void runFileEmbeddingJob(fileId).catch(err => {
    logger.warn({ fileId, err }, 'file embedding job failed')
  })
}

async function runFileEmbeddingJob(fileId: string): Promise<void> {
  if (fileInFlight.has(fileId)) {
    return
  }
  fileInFlight.add(fileId)
  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, sourceText: true },
    })
    const text = file?.sourceText?.trim() ?? ''
    if (!text) {
      return
    }
    const vector = await generateEmbedding(text)
    await persistFileVector(fileId, vector)
  } finally {
    fileInFlight.delete(fileId)
  }
}
