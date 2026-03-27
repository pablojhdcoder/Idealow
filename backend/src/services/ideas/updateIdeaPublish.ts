import { prisma } from '../../lib/prisma'
import { HttpError } from '../../lib/httpError'
import { scheduleIdeaEmbedding } from '../embeddings/embeddingJob'

export async function updateIdeaPublishState(
  userId: string,
  ideaId: string,
  isPublished: boolean,
): Promise<{ id: string; isPublished: boolean; publishedAt: Date | null }> {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, userId },
    select: { id: true, status: true, isPublished: true, publishedAt: true },
  })

  if (!idea) {
    throw new HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND')
  }

  if (isPublished && idea.status !== 'VALIDATED') {
    throw new HttpError(
      400,
      'Only validated ideas can be published to the community.',
      'IDEAS_PUBLISH_NOT_VALIDATED',
    )
  }

  const shouldPublishNow = isPublished && !idea.isPublished
  const shouldUnpublishNow = !isPublished && idea.isPublished
  if (!shouldPublishNow && !shouldUnpublishNow) {
    return {
      id: idea.id,
      isPublished: idea.isPublished,
      publishedAt: idea.publishedAt,
    }
  }

  const publishedAt = shouldPublishNow ? new Date() : null
  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      isPublished,
      publishedAt,
    },
    select: { id: true, isPublished: true, publishedAt: true },
  })

  scheduleIdeaEmbedding(ideaId)

  return updated
}
