import { prisma } from '../../lib/prisma'
import { HttpError } from '../../lib/httpError'

const MAX_COMMENT = 280

export type FeedbackVote = 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL'

export async function submitIdeaFeedback(params: {
  ideaId: string
  userId: string
  vote: FeedbackVote
  comment?: string
}): Promise<{ ok: true; vote: FeedbackVote; comment: string | null }> {
  const { ideaId, userId, vote, comment } = params
  const trimmed = comment?.trim() ?? ''
  if (trimmed.length > MAX_COMMENT) {
    throw new HttpError(422, `Comment must be at most ${MAX_COMMENT} characters`, 'FEEDBACK_COMMENT_TOO_LONG')
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, isPublished: true, userId: true },
  })

  if (!idea || !idea.isPublished) {
    throw new HttpError(404, 'Published idea not found', 'FEEDBACK_IDEA_NOT_FOUND')
  }

  if (idea.userId === userId) {
    throw new HttpError(400, 'You cannot vote on your own idea', 'FEEDBACK_OWN_IDEA')
  }

  await prisma.ideaFeedback.upsert({
    where: { ideaId_userId: { ideaId, userId } },
    create: {
      ideaId,
      userId,
      vote,
      comment: trimmed.length > 0 ? trimmed : null,
    },
    update: {
      vote,
      comment: trimmed.length > 0 ? trimmed : null,
    },
  })

  return { ok: true, vote, comment: trimmed.length > 0 ? trimmed : null }
}

export type FeedbackCommentRow = {
  id: string
  comment: string | null
  vote: string
  createdAt: Date
  user: { username: string; avatarUrl: string | null }
}

export async function listIdeaFeedbackComments(
  ideaId: string,
  options: { cursor?: string; limit: number },
): Promise<{ items: FeedbackCommentRow[]; nextCursor: string | null }> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, isPublished: true },
  })

  if (!idea || !idea.isPublished) {
    throw new HttpError(404, 'Published idea not found', 'FEEDBACK_IDEA_NOT_FOUND')
  }

  const take = options.limit + 1
  const rows = await prisma.ideaFeedback.findMany({
    where: {
      ideaId,
      comment: { not: null },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      comment: true,
      vote: true,
      createdAt: true,
      user: { select: { username: true, avatarUrl: true } },
    },
  })

  const hasMore = rows.length > options.limit
  const items = hasMore ? rows.slice(0, options.limit) : rows
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null

  return {
    items: items.map(r => ({
      ...r,
      comment: r.comment,
    })),
    nextCursor,
  }
}
