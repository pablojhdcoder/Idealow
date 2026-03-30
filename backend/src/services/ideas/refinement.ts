import type { Idea, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { HttpError } from '../../lib/httpError'
import {
  generateQuestions,
  type RefinementAnswerInput,
  type RefinementQuestionsResponse,
  type RefinedIdeaPayload,
  synthesizeAnswers,
} from '../ai/refiner'
import { scheduleIdeaEmbedding } from '../embeddings/embeddingJob'
import { runValidation } from '../validation/runValidation'
import { logger } from '../../lib/logger'
type ExtractionShape = {
  problem?: string
  solution?: string
  target_audience?: string
}

function extractionFromRefinedContent(
  refinedContent: Prisma.JsonValue | null,
  fallbackSummary: string | null,
): { problem: string; solution: string; target_audience: string } {
  if (refinedContent && typeof refinedContent === 'object' && !Array.isArray(refinedContent)) {
    const o = refinedContent as ExtractionShape & { refined?: unknown }
    const base = o.refined != null && typeof o.refined === 'object' ? (o.refined as ExtractionShape) : o
    return {
      problem: typeof base.problem === 'string' && base.problem.trim() ? base.problem : fallbackSummary ?? '',
      solution: typeof base.solution === 'string' ? base.solution : '',
      target_audience: typeof base.target_audience === 'string' ? base.target_audience : '',
    }
  }
  return {
    problem: fallbackSummary ?? '',
    solution: '',
    target_audience: '',
  }
}

export async function loadRefinementQuestions(
  userId: string,
  ideaId: string,
): Promise<RefinementQuestionsResponse> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
  })
  if (!idea) {
    throw new HttpError(404, 'Idea no encontrada', 'IDEAS_NOT_FOUND')
  }

  const { problem, solution, target_audience } = extractionFromRefinedContent(
    idea.refinedContent,
    idea.summary,
  )

  return generateQuestions({
    title: idea.title,
    problem,
    solution,
    target_audience,
    sector: idea.sector ?? 'other',
  })
}

export async function submitRefinement(
  userId: string,
  ideaId: string,
  answers: RefinementAnswerInput[],
) {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    include: { user: true },
  })
  if (!idea) {
    throw new HttpError(404, 'Idea no encontrada', 'IDEAS_NOT_FOUND')
  }

  const prevContent =
    idea.refinedContent && typeof idea.refinedContent === 'object' && !Array.isArray(idea.refinedContent)
      ? (idea.refinedContent as Record<string, unknown>)
      : {}

  const refined = await synthesizeAnswers(prevContent, answers, {
    sectors: idea.user.sectors,
    goal: idea.user.goal,
  })

  const nextRefinedContent: Prisma.InputJsonValue = {
    ...prevContent,
    refined,
    wizardAnswers: answers,
  }

  const updated = await prisma.idea.update({
    where: { id: idea.id },
    data: {
      refinedContent: nextRefinedContent,
      title: refined.refined_title || idea.title,
      summary: refined.elevator_pitch,
      status: 'REFINING',
    },
  })

  scheduleIdeaEmbedding(updated.id)

  /** La validación se inicia tras la revisión/edición del usuario (`confirmRefinedContent`). */
  return { idea: updated, nextStep: 'review_refined' as const }
}

/**
 * Persiste la versión editada del bloque `refined` y arranca la validación de mercado (si aún no hay resultado).
 */
export async function confirmRefinedContent(
  userId: string,
  ideaId: string,
  refined: RefinedIdeaPayload,
): Promise<{ idea: Idea; nextStep: 'validation' }> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
  })
  if (!idea) {
    throw new HttpError(404, 'Idea no encontrada', 'IDEAS_NOT_FOUND')
  }

  const prevContent =
    idea.refinedContent && typeof idea.refinedContent === 'object' && !Array.isArray(idea.refinedContent)
      ? (idea.refinedContent as Record<string, unknown>)
      : null

  if (!prevContent || prevContent.refined == null || typeof prevContent.refined !== 'object') {
    throw new HttpError(
      422,
      'Primero completa el asistente de refinamiento',
      'IDEAS_REFINED_WIZARD_INCOMPLETE',
    )
  }

  const nextRefinedContent: Prisma.InputJsonValue = {
    ...prevContent,
    refined,
  }

  const updated = await prisma.idea.update({
    where: { id: idea.id },
    data: {
      refinedContent: nextRefinedContent,
      title: refined.refined_title || idea.title,
      summary: refined.elevator_pitch,
      status: 'REFINING',
      refinementConfirmedAt: new Date(),
    },
  })

  scheduleIdeaEmbedding(updated.id)

  if (idea.validationScore == null) {
    void runValidation(updated.id, userId).catch(err => {
      logger.error({ ideaId: updated.id, err }, 'runValidation after refined confirm failed')
    })
  }

  return { idea: updated, nextStep: 'validation' as const }
}
