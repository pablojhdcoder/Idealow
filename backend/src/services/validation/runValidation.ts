import { config } from '../../config'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { aggregateScore } from './aggregator'
import { validateReddit } from './reddit'
import { validateTrends } from './trends'
import { validateCompetitors } from './competitors'
import { validateSocial } from './social'
import { validateNews } from './news'
import { emitValidationSse } from './sseHub'
import { refinedContentToValidationInput } from './refinedToValidationInput'

/** Evita leases colgados si el proceso muere a mitad de validación. */
const VALIDATION_LEASE_STALE_MS = 30 * 60 * 1000

const runningValidations = new Set<string>()

async function claimValidationLease(ideaId: string, userId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - VALIDATION_LEASE_STALE_MS)
  const result = await prisma.idea.updateMany({
    where: {
      id: ideaId,
      userId,
      validationScore: null,
      OR: [{ validationStartedAt: null }, { validationStartedAt: { lt: staleBefore } }],
    },
    data: { validationStartedAt: new Date() },
  })
  return result.count === 1
}

async function releaseValidationLease(ideaId: string): Promise<void> {
  await prisma.idea.updateMany({
    where: { id: ideaId, validationScore: null },
    data: { validationStartedAt: null },
  })
}

function emit(ideaId: string, data: object) {
  emitValidationSse(ideaId, data)
}

function sourceFailurePublicMessage(err: unknown): string {
  if (config.nodeEnv === 'production') {
    return 'Source validation failed'
  }
  return err instanceof Error ? err.message : 'Unknown error'
}

function executionFailurePublicMessage(err: unknown): string {
  if (config.nodeEnv === 'production') {
    return 'Validation failed'
  }
  return err instanceof Error ? err.message : 'Validation failed'
}

export async function runValidation(ideaId: string, userId: string): Promise<void> {
  if (runningValidations.has(ideaId)) {
    logger.info({ ideaId }, 'validation already running, skip duplicate')
    emit(ideaId, {
      type: 'error',
      code: 'VALIDATION_ALREADY_RUNNING',
      message: 'Validation is already running for this idea.',
    })
    return
  }
  runningValidations.add(ideaId)
  try {
    await executeValidation(ideaId, userId)
  } finally {
    runningValidations.delete(ideaId)
  }
}

async function executeValidation(ideaId: string, userId: string): Promise<void> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
  })
  if (!idea) {
    emit(ideaId, { type: 'error', code: 'VALIDATION_IDEA_NOT_FOUND', message: 'Idea not found' })
    return
  }

  /** Una sola ejecución por idea: resultados persistidos en BD. */
  if (idea.validationScore != null && idea.validationData != null) {
    logger.info({ ideaId }, 'validation already persisted, skip')
    return
  }

  if (idea.status !== 'REFINING' && idea.status !== 'VALIDATED') {
    emit(ideaId, {
      type: 'error',
      code: 'VALIDATION_BAD_STATUS',
      message: 'Refine the idea before running validation.',
    })
    return
  }

  const input = refinedContentToValidationInput(idea.refinedContent, idea.summary)
  if (!input) {
    emit(ideaId, {
      type: 'error',
      code: 'VALIDATION_NO_REFINED_CONTENT',
      message: 'Missing refined content to validate.',
    })
    return
  }

  const claimedLease = await claimValidationLease(ideaId, userId)
  if (!claimedLease) {
    logger.info({ ideaId }, 'validation lease not acquired (another replica or in-flight)')
    emit(ideaId, {
      type: 'error',
      code: 'VALIDATION_BUSY',
      message:
        'Another validation is in progress or the slot is locked. Try again in a few minutes.',
    })
    return
  }

  try {
    const [reddit, trends, competitors, social, news] = await Promise.allSettled([
      (async () => {
        emit(ideaId, { source: 'reddit', status: 'searching' })
        const r = await validateReddit(input)
        emit(ideaId, { source: 'reddit', status: 'done', ...r })
        return r
      })(),
      (async () => {
        emit(ideaId, { source: 'trends', status: 'searching' })
        const r = await validateTrends(input)
        emit(ideaId, { source: 'trends', status: 'done', ...r })
        return r
      })(),
      (async () => {
        emit(ideaId, { source: 'competitors', status: 'searching' })
        const r = await validateCompetitors(input)
        emit(ideaId, { source: 'competitors', status: 'done', ...r })
        return r
      })(),
      (async () => {
        emit(ideaId, { source: 'social', status: 'searching' })
        const r = await validateSocial(input)
        emit(ideaId, { source: 'social', status: 'done', ...r })
        return r
      })(),
      (async () => {
        emit(ideaId, { source: 'news', status: 'searching' })
        const r = await validateNews(input)
        emit(ideaId, { source: 'news', status: 'done', ...r })
        return r
      })(),
    ])

    const results = {
      reddit: reddit.status === 'fulfilled' ? reddit.value : null,
      trends: trends.status === 'fulfilled' ? trends.value : null,
      competitors: competitors.status === 'fulfilled' ? competitors.value : null,
      social: social.status === 'fulfilled' ? social.value : null,
      news: news.status === 'fulfilled' ? news.value : null,
    }

    for (const [name, settled] of [
      ['reddit', reddit],
      ['trends', trends],
      ['competitors', competitors],
      ['social', social],
      ['news', news],
    ] as const) {
      if (settled.status === 'rejected') {
        logger.warn({ ideaId, source: name, err: settled.reason }, 'validation source failed')
        emit(ideaId, {
          source: name,
          status: 'error',
          message: sourceFailurePublicMessage(settled.reason),
        })
      }
    }

    const scoreReport = aggregateScore({
      reddit: results.reddit,
      trends: results.trends,
      competitors: results.competitors,
      social: results.social,
      news: results.news,
    })

    const competitorList = results.competitors?.competitors ?? []

    const publishMeta = await prisma.idea.findFirst({
      where: { id: ideaId, userId },
      select: { isPublished: true, publishedAt: true },
    })

    await prisma.idea.update({
      where: { id: ideaId },
      data: {
        validationScore: scoreReport.validation_score,
        validationData: { ...results, ...scoreReport },
        competitors: competitorList,
        status: 'VALIDATED',
        validationStartedAt: null,
        ...(publishMeta?.isPublished && publishMeta.publishedAt == null ? { publishedAt: new Date() } : {}),
      },
    })

    emit(ideaId, { type: 'complete', ...scoreReport })
  } catch (err) {
    await releaseValidationLease(ideaId)
    logger.error({ ideaId, err }, 'executeValidation failed')
    emit(ideaId, {
      type: 'error',
      code: 'VALIDATION_EXECUTION_FAILED',
      message: executionFailurePublicMessage(err),
    })
  }
}

