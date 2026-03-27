import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { generateEmbedding } from './generateEmbedding'
import type { IdeaListItem } from '../ideas/listIdeas'

export type SemanticSearchRow = IdeaListItem

function vectorParam(vec: number[]): string {
  return JSON.stringify(vec)
}

/**
 * Ideas del usuario ordenadas por similitud coseno (operador <=> de pgvector).
 */
export async function searchIdeasByVector(params: {
  userId: string
  vector: number[]
  limit: number
  excludeIdeaId?: string
}): Promise<SemanticSearchRow[]> {
  const { userId, vector, limit, excludeIdeaId } = params
  const v = vectorParam(vector)
  const excludeClause =
    excludeIdeaId != null
      ? Prisma.sql`AND id <> ${excludeIdeaId}::uuid`
      : Prisma.empty

  const rows = await prisma.$queryRaw<SemanticSearchRow[]>`
    SELECT id, title, summary, sector, status, "isPublished", "validationScore", "createdAt"
    FROM "Idea"
    WHERE "userId" = ${userId}::uuid
      AND embedding IS NOT NULL
      ${excludeClause}
    ORDER BY embedding <=> ${v}::vector
    LIMIT ${limit}
  `

  return rows
}

export async function semanticSearchForUser(
  userId: string,
  query: string,
  limit: number,
): Promise<SemanticSearchRow[]> {
  const vector = await generateEmbedding(query)
  return searchIdeasByVector({ userId, vector, limit })
}

export async function similarIdeasForUser(
  userId: string,
  ideaId: string,
  limit: number,
): Promise<SemanticSearchRow[]> {
  const rows = await prisma.$queryRaw<SemanticSearchRow[]>`
    SELECT id, title, summary, sector, status, "isPublished", "validationScore", "createdAt"
    FROM "Idea"
    WHERE "userId" = ${userId}::uuid
      AND embedding IS NOT NULL
      AND id <> ${ideaId}::uuid
      AND EXISTS (
        SELECT 1 FROM "Idea" anchor
        WHERE anchor.id = ${ideaId}::uuid
          AND anchor."userId" = ${userId}::uuid
          AND anchor.embedding IS NOT NULL
      )
    ORDER BY embedding <=> (
      SELECT embedding FROM "Idea"
      WHERE id = ${ideaId}::uuid AND "userId" = ${userId}::uuid
      LIMIT 1
    )
    LIMIT ${limit}
  `

  return rows
}
