import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import {
  getVoteCountsForIdeaIds,
  mapIdeaRowToFlashcard,
  type IdeaFlashcardPayload,
} from '../ideas/ideaFlashcard'

export type FeedSort = 'new' | 'score' | 'votes'
export type FeedFilter = 'all' | 'strong'

export type ListFeedParams = {
  limit: number
  cursor?: string
  /** Solo aplica cuando sort=votes */
  page?: number
  sector?: string
  sort: FeedSort
  filter: FeedFilter
  q?: string
}

export type ListFeedResult = {
  items: IdeaFlashcardPayload[]
  nextCursor: string | null
  nextPage: number | null
}

function strongWhere(): Prisma.IdeaWhereInput {
  return {
    validationScore: { gte: 75 },
  }
}

function textSearchWhere(q: string): Prisma.IdeaWhereInput {
  const term = q.trim()
  if (!term) return {}
  return {
    OR: [
      { title: { contains: term, mode: 'insensitive' } },
      { summary: { contains: term, mode: 'insensitive' } },
      { rawContent: { contains: term, mode: 'insensitive' } },
    ],
  }
}

const selectUser = {
  user: { select: { id: true, username: true, avatarUrl: true } },
} as const

type IdeaRow = Prisma.IdeaGetPayload<{ include: typeof selectUser }>

function toPayloadRows(ideas: IdeaRow[], voteMap: Map<string, import('../ideas/ideaFlashcard').CommunityVotes>) {
  return ideas.map(idea =>
    mapIdeaRowToFlashcard(
      {
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        sector: idea.sector,
        status: idea.status,
        refinedContent: idea.refinedContent,
        validationScore: idea.validationScore,
        validationData: idea.validationData,
        competitors: idea.competitors,
        isPublished: idea.isPublished,
        publishedAt: idea.publishedAt,
        createdAt: idea.createdAt,
        user: idea.user,
      },
      voteMap.get(idea.id) ?? { useful: 0, interesting: 0, notUseful: 0 },
      null,
    ),
  )
}

export async function listPublishedFeed(params: ListFeedParams): Promise<ListFeedResult> {
  const baseWhere: Prisma.IdeaWhereInput = {
    isPublished: true,
    status: 'VALIDATED',
    ...(params.sector ? { sector: params.sector } : {}),
    ...(params.filter === 'strong' ? strongWhere() : {}),
    ...textSearchWhere(params.q ?? ''),
  }

  const limit = params.limit

  if (params.sort === 'votes') {
    const page = Math.max(1, params.page ?? 1)
    const skip = (page - 1) * limit

    const matchingIds = await prisma.idea.findMany({
      where: baseWhere,
      select: { id: true },
    })
    const idList = matchingIds.map(x => x.id)
    if (idList.length === 0) {
      return { items: [], nextCursor: null, nextPage: null }
    }

    const counts = await prisma.ideaFeedback.groupBy({
      by: ['ideaId'],
      where: { ideaId: { in: idList } },
      _count: { _all: true },
    })
    const countMap = new Map(counts.map(c => [c.ideaId, c._count._all]))

    const orderedIds = [...idList].sort((a, b) => {
      const ca = countMap.get(a) ?? 0
      const cb = countMap.get(b) ?? 0
      if (cb !== ca) return cb - ca
      return b.localeCompare(a)
    })

    const slice = orderedIds.slice(skip, skip + limit + 1)
    const hasMore = slice.length > limit
    const pageIds = hasMore ? slice.slice(0, limit) : slice

    if (pageIds.length === 0) {
      return { items: [], nextCursor: null, nextPage: null }
    }

    const ideas = await prisma.idea.findMany({
      where: { id: { in: pageIds } },
      include: selectUser,
    })
    const orderIndex = new Map(pageIds.map((id, i) => [id, i]))
    ideas.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))

    const voteMap = await getVoteCountsForIdeaIds(pageIds)
    const items = toPayloadRows(ideas, voteMap)
    const nextPage = hasMore ? page + 1 : null

    return { items, nextCursor: null, nextPage }
  }

  const take = limit + 1
  const orderBy: Prisma.IdeaOrderByWithRelationInput[] =
    params.sort === 'score'
      ? [{ validationScore: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }]
      : [{ publishedAt: 'desc' }, { id: 'desc' }]

  const ideas = await prisma.idea.findMany({
    where: baseWhere,
    orderBy,
    take,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    include: selectUser,
  })

  const hasMore = ideas.length > limit
  const pageIdeas = hasMore ? ideas.slice(0, limit) : ideas
  const ids = pageIdeas.map(i => i.id)
  const voteMap = await getVoteCountsForIdeaIds(ids)
  const items = toPayloadRows(pageIdeas, voteMap)
  const nextCursor = hasMore && pageIdeas.length > 0 ? pageIdeas[pageIdeas.length - 1]!.id : null

  return { items, nextCursor, nextPage: null }
}
