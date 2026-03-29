import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { HttpError } from '../../lib/httpError'

export type Verdict = 'STRONG_SIGNAL' | 'MODERATE_SIGNAL' | 'WEAK_SIGNAL' | 'NO_SIGNAL'

export type CommunityVotes = {
  useful: number
  interesting: number
  notUseful: number
}

export type IdeaFlashcardAuthor = {
  id: string
  username: string
  avatarUrl: string | null
}

export type CompetitorPublic = {
  name: string
  url?: string
  description?: string
  strength?: string
  weakness?: string
  approximateUsers?: string
}

export type ValidationBreakdownEntry = {
  score: number | null
  weight: number
  contribution: number | null
}

export type IdeaFlashcardPayload = {
  id: string
  refinedTitle: string
  elevatorPitch: string
  sector: string
  validationScore: number
  verdict: Verdict
  problemStatement: string
  solution: string
  targetCustomer: string
  monetization: string
  mvpFeature: string
  distribution: string
  whyNow: string
  biggestRisk: string
  competitors: CompetitorPublic[]
  validationBreakdown: Record<string, ValidationBreakdownEntry> | null
  isPublished: boolean
  publishedAt: string | null
  author: IdeaFlashcardAuthor
  communityVotes: CommunityVotes
  createdAt: string
  status: string
  myVote: 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL' | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return null
}

function pickString(obj: Record<string, unknown>, key: string): string {
  const x = obj[key]
  return typeof x === 'string' ? x.trim() : ''
}

function verdictFromScore(score: number | null): Verdict {
  if (score == null || Number.isNaN(score)) return 'NO_SIGNAL'
  if (score >= 75) return 'STRONG_SIGNAL'
  if (score >= 55) return 'MODERATE_SIGNAL'
  if (score >= 35) return 'WEAK_SIGNAL'
  return 'NO_SIGNAL'
}

function parseVerdict(validationData: Prisma.JsonValue | null, validationScore: number | null): Verdict {
  const root = asRecord(validationData)
  const v = root && typeof root.verdict === 'string' ? root.verdict.trim() : ''
  if (
    v === 'STRONG_SIGNAL' ||
    v === 'MODERATE_SIGNAL' ||
    v === 'WEAK_SIGNAL' ||
    v === 'NO_SIGNAL'
  ) {
    return v
  }
  return verdictFromScore(validationScore)
}

function parseBreakdown(validationData: Prisma.JsonValue | null): Record<string, ValidationBreakdownEntry> | null {
  const root = asRecord(validationData)
  const b = root ? root.breakdown : null
  const br = asRecord(b)
  if (!br) return null
  const out: Record<string, ValidationBreakdownEntry> = {}
  for (const [k, val] of Object.entries(br)) {
    const o = asRecord(val)
    if (!o) continue
    const score = typeof o.score === 'number' ? o.score : null
    const weight = typeof o.weight === 'number' ? o.weight : 0
    const contribution = typeof o.contribution === 'number' ? o.contribution : null
    out[k] = { score, weight, contribution }
  }
  return Object.keys(out).length > 0 ? out : null
}

function parseCompetitors(raw: Prisma.JsonValue | null): CompetitorPublic[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): CompetitorPublic | null => {
      const o = asRecord(item)
      if (!o) return null
      const name = pickString(o, 'name')
      if (!name) return null
      return {
        name,
        url: pickString(o, 'url') || undefined,
        description: pickString(o, 'description') || undefined,
        strength: pickString(o, 'strength') || undefined,
        weakness: pickString(o, 'weakness') || undefined,
        approximateUsers: pickString(o, 'approximate_users') || undefined,
      }
    })
    .filter((x): x is CompetitorPublic => x != null)
}

function refinedShape(refinedContent: Prisma.JsonValue | null, fallback: { title: string; summary: string | null }) {
  const root = asRecord(refinedContent)
  const refined = root ? asRecord(root.refined) : null
  const from = refined ?? root ?? {}

  return {
    refinedTitle:
      pickString(from, 'refined_title') || pickString(root ?? {}, 'title') || fallback.title,
    elevatorPitch:
      pickString(from, 'elevator_pitch') || (fallback.summary ?? '').trim() || pickString(root ?? {}, 'elevator_pitch'),
    problemStatement:
      pickString(from, 'problem_statement') || pickString(root ?? {}, 'problem') || '',
    solution: pickString(from, 'solution') || pickString(root ?? {}, 'solution') || '',
    targetCustomer:
      pickString(from, 'target_customer') || pickString(root ?? {}, 'target_audience') || '',
    monetization: pickString(from, 'monetization') || '',
    mvpFeature: pickString(from, 'mvp_feature') || '',
    distribution: pickString(from, 'distribution') || '',
    whyNow: pickString(from, 'why_now') || '',
    biggestRisk: pickString(from, 'biggest_risk') || '',
  }
}

export async function getVoteCountsForIdeaIds(ideaIds: string[]): Promise<Map<string, CommunityVotes>> {
  const map = new Map<string, CommunityVotes>()
  for (const id of ideaIds) {
    map.set(id, { useful: 0, interesting: 0, notUseful: 0 })
  }
  if (ideaIds.length === 0) return map

  const rows = await prisma.ideaFeedback.groupBy({
    by: ['ideaId', 'vote'],
    where: { ideaId: { in: ideaIds } },
    _count: { _all: true },
  })

  for (const row of rows) {
    const cur = map.get(row.ideaId)
    if (!cur) continue
    const n = row._count._all
    if (row.vote === 'USEFUL') cur.useful += n
    else if (row.vote === 'INTERESTING') cur.interesting += n
    else if (row.vote === 'NOT_USEFUL') cur.notUseful += n
  }
  return map
}

export async function getMyVote(
  ideaId: string,
  userId: string | undefined,
): Promise<'USEFUL' | 'INTERESTING' | 'NOT_USEFUL' | null> {
  if (!userId) return null
  const row = await prisma.ideaFeedback.findUnique({
    where: { ideaId_userId: { ideaId, userId } },
    select: { vote: true },
  })
  const v = row?.vote
  if (v === 'USEFUL' || v === 'INTERESTING' || v === 'NOT_USEFUL') return v
  return null
}

type IdeaWithUser = {
  id: string
  title: string
  summary: string | null
  sector: string | null
  status: string
  refinedContent: Prisma.JsonValue | null
  validationScore: number | null
  validationData: Prisma.JsonValue | null
  competitors: Prisma.JsonValue | null
  isPublished: boolean
  publishedAt: Date | null
  createdAt: Date
  user: { id: string; username: string; avatarUrl: string | null }
}

export function mapIdeaRowToFlashcard(
  idea: IdeaWithUser,
  votes: CommunityVotes,
  myVote: 'USEFUL' | 'INTERESTING' | 'NOT_USEFUL' | null,
): IdeaFlashcardPayload {
  const r = refinedShape(idea.refinedContent, { title: idea.title, summary: idea.summary })
  const sector = (idea.sector ?? 'other').toLowerCase() || 'other'

  return {
    id: idea.id,
    refinedTitle: r.refinedTitle,
    elevatorPitch: r.elevatorPitch || (idea.summary ?? ''),
    sector,
    validationScore: idea.validationScore ?? 0,
    verdict: parseVerdict(idea.validationData, idea.validationScore),
    problemStatement: r.problemStatement,
    solution: r.solution,
    targetCustomer: r.targetCustomer,
    monetization: r.monetization,
    mvpFeature: r.mvpFeature,
    distribution: r.distribution,
    whyNow: r.whyNow,
    biggestRisk: r.biggestRisk,
    competitors: parseCompetitors(idea.competitors),
    validationBreakdown: parseBreakdown(idea.validationData),
    isPublished: idea.isPublished,
    publishedAt: idea.publishedAt ? idea.publishedAt.toISOString() : null,
    author: {
      id: idea.user.id,
      username: idea.user.username,
      avatarUrl: idea.user.avatarUrl,
    },
    communityVotes: votes,
    createdAt: idea.createdAt.toISOString(),
    status: idea.status,
    myVote,
  }
}

export async function getIdeaFlashcardForViewer(
  ideaId: string,
  viewerUserId: string | undefined,
): Promise<{
  flashcard: IdeaFlashcardPayload
  isOwner: boolean
  /** Solo propietario: JSON completo de validación para la UI sin re-ejecutar pipelines. */
  validationSnapshot: Prisma.JsonValue | null
}> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  if (!idea) {
    throw new HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND')
  }

  const isOwner = viewerUserId != null && idea.userId === viewerUserId
  const communityVisible = idea.isPublished && idea.status === 'VALIDATED'
  if (!isOwner && !communityVisible) {
    throw new HttpError(404, 'Idea not found', 'IDEAS_NOT_FOUND')
  }

  const voteMap = await getVoteCountsForIdeaIds([ideaId])
  const votes = voteMap.get(ideaId) ?? { useful: 0, interesting: 0, notUseful: 0 }
  const myVote = await getMyVote(ideaId, viewerUserId)

  const flashcard = mapIdeaRowToFlashcard(
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
    votes,
    myVote,
  )

  return {
    flashcard,
    isOwner,
    validationSnapshot: isOwner ? idea.validationData : null,
  }
}
