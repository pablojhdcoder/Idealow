"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchIdeasByVector = searchIdeasByVector;
exports.semanticSearchForUser = semanticSearchForUser;
exports.similarIdeasForUser = similarIdeasForUser;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../lib/prisma");
const generateEmbedding_1 = require("./generateEmbedding");
function vectorParam(vec) {
    return JSON.stringify(vec);
}
/**
 * Ideas del usuario ordenadas por similitud coseno (operador <=> de pgvector).
 */
async function searchIdeasByVector(params) {
    const { userId, vector, limit, excludeIdeaId } = params;
    const v = vectorParam(vector);
    const excludeClause = excludeIdeaId != null
        ? client_1.Prisma.sql `AND id <> ${excludeIdeaId}::uuid`
        : client_1.Prisma.empty;
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT id, title, summary, sector, status, "isPublished", "validationScore", "createdAt"
    FROM "Idea"
    WHERE "userId" = ${userId}::uuid
      AND embedding IS NOT NULL
      ${excludeClause}
    ORDER BY embedding <=> ${v}::vector
    LIMIT ${limit}
  `;
    return rows;
}
async function semanticSearchForUser(userId, query, limit) {
    const vector = await (0, generateEmbedding_1.generateEmbedding)(query);
    return searchIdeasByVector({ userId, vector, limit });
}
async function similarIdeasForUser(userId, ideaId, limit) {
    const rows = await prisma_1.prisma.$queryRaw `
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
  `;
    return rows;
}
