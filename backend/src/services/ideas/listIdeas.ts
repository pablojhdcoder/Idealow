import { prisma } from '../../lib/prisma'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export type IdeaListItem = {
  id: string
  title: string
  summary: string | null
  sector: string | null
  status: string
  isPublished: boolean
  validationScore: number | null
  /** null = aún no confirmó la revisión post-wizard (validación no lanzada). */
  refinementConfirmedAt: Date | null
  createdAt: Date
}

export type ListIdeasPage = {
  ideas: IdeaListItem[]
  nextCursor: string | null
}

export async function listIdeasForUser(
  userId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<ListIdeasPage> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  const take = limit + 1

  const items = await prisma.idea.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      summary: true,
      sector: true,
      status: true,
      isPublished: true,
      validationScore: true,
      refinementConfirmedAt: true,
      createdAt: true,
    },
  })

  const hasMore = items.length > limit
  const ideas = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore && ideas.length > 0 ? ideas[ideas.length - 1]!.id : null

  return { ideas, nextCursor }
}
