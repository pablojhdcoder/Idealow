import { Prisma } from '@prisma/client'
import { config } from '../../config'
import { prisma } from '../../lib/prisma'
import { generateEmbedding } from './generateEmbedding'
import { buildEmbeddingTextForSearchQuery } from './textForIdea'
import type { IdeaListItem } from '../ideas/listIdeas'

export type SemanticSearchRow = IdeaListItem

function vectorParam(vec: number[]): string {
  return JSON.stringify(vec)
}

const ideaListSelect = {
  id: true,
  title: true,
  summary: true,
  sector: true,
  status: true,
  isPublished: true,
  validationScore: true,
  createdAt: true,
} as const

/**
 * Misma lógica que el feed: título, resumen y contenido bruto capturado.
 */
export async function searchUserIdeasByKeyword(
  userId: string,
  term: string,
  limit: number,
): Promise<SemanticSearchRow[]> {
  const t = term.trim()
  if (!t || limit <= 0) {
    return []
  }

  return prisma.idea.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: t, mode: 'insensitive' } },
        { summary: { contains: t, mode: 'insensitive' } },
        { rawContent: { contains: t, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: ideaListSelect,
  })
}

/**
 * Ideas del usuario ordenadas por similitud coseno (operador `<=>` de pgvector).
 * Solo filas con distancia estrictamente menor que `semanticMaxCosineDistance` (config / env).
 */
export async function searchIdeasByVector(params: {
  userId: string
  vector: number[]
  limit: number
  excludeIdeaId?: string
  excludeIdeaIds?: string[]
  maxCosineDistance?: number
}): Promise<SemanticSearchRow[]> {
  const { userId, vector, limit, excludeIdeaId, excludeIdeaIds } = params
  const maxD = params.maxCosineDistance ?? config.semanticMaxCosineDistance
  const v = vectorParam(vector)

  const excludeIdClause =
    excludeIdeaId != null ? Prisma.sql`AND id <> ${excludeIdeaId}` : Prisma.empty

  const extraExclude =
    excludeIdeaIds != null && excludeIdeaIds.length > 0
      ? Prisma.sql`AND id NOT IN (${Prisma.join(excludeIdeaIds)})`
      : Prisma.empty

  const rows = await prisma.$queryRaw<SemanticSearchRow[]>`
    SELECT id, title, summary, sector, status, "isPublished", "validationScore", "createdAt"
    FROM "Idea"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
      AND (embedding <=> ${v}::vector) < ${maxD}
      ${excludeIdClause}
      ${extraExclude}
    ORDER BY embedding <=> ${v}::vector
    LIMIT ${limit}
  `

  return rows
}

/**
 * Híbrido: primero coincidencias por texto (como el feed comunitario), luego relleno por embeddings con umbral 0.34.
 */
export async function semanticSearchForUser(
  userId: string,
  query: string,
  limit: number,
): Promise<SemanticSearchRow[]> {
  const term = query.trim()
  if (!term || limit <= 0) {
    return []
  }

  const textRows = await searchUserIdeasByKeyword(userId, term, limit)
  const textIds = textRows.map(r => r.id)
  const remaining = limit - textRows.length

  if (remaining <= 0) {
    return textRows
  }

  const vector = await generateEmbedding(buildEmbeddingTextForSearchQuery(term))
  const vectorRows = await searchIdeasByVector({
    userId,
    vector,
    limit: remaining,
    excludeIdeaIds: textIds,
  })

  return [...textRows, ...vectorRows]
}

export async function similarIdeasForUser(
  userId: string,
  ideaId: string,
  limit: number,
  maxCosineDistance?: number,
): Promise<SemanticSearchRow[]> {
  const maxD = maxCosineDistance ?? config.semanticMaxCosineDistance
  const rows = await prisma.$queryRaw<SemanticSearchRow[]>`
    SELECT id, title, summary, sector, status, "isPublished", "validationScore", "createdAt"
    FROM "Idea"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
      AND id <> ${ideaId}
      AND EXISTS (
        SELECT 1 FROM "Idea" anchor
        WHERE anchor.id = ${ideaId}
          AND anchor."userId" = ${userId}
          AND anchor.embedding IS NOT NULL
      )
      AND (
        embedding <=> (
          SELECT embedding FROM "Idea"
          WHERE id = ${ideaId} AND "userId" = ${userId}
          LIMIT 1
        )
      ) < ${maxD}
    ORDER BY embedding <=> (
      SELECT embedding FROM "Idea"
      WHERE id = ${ideaId} AND "userId" = ${userId}
      LIMIT 1
    )
    LIMIT ${limit}
  `

  return rows
}

/**
 * IDs de ideas publicadas y validadas (toda la app), ordenadas por similitud al embedding de la idea ancla.
 * La ancla debe tener `embedding` no nulo o el resultado será vacío.
 */
export async function similarPublishedIdeaIdsByAnchor(
  anchorIdeaId: string,
  limit: number,
  maxCosineDistance?: number,
): Promise<string[]> {
  const maxD = maxCosineDistance ?? config.semanticMaxCosineDistance
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT i.id
    FROM "Idea" i
    WHERE i."isPublished" = true
      AND i.status = 'VALIDATED'
      AND i.embedding IS NOT NULL
      AND i.id <> ${anchorIdeaId}
      AND EXISTS (
        SELECT 1 FROM "Idea" a
        WHERE a.id = ${anchorIdeaId}
          AND a.embedding IS NOT NULL
      )
      AND (
        i.embedding <=> (
          SELECT embedding FROM "Idea" WHERE id = ${anchorIdeaId} LIMIT 1
        )
      ) < ${maxD}
    ORDER BY i.embedding <=> (
      SELECT embedding FROM "Idea" WHERE id = ${anchorIdeaId} LIMIT 1
    )
    LIMIT ${limit}
  `
  return rows.map(r => r.id)
}
