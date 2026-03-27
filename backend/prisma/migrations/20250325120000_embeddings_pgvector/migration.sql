-- Enable pgvector (requiere la extensión instalada en el servidor PostgreSQL)
CREATE EXTENSION IF NOT EXISTS vector;

-- Sustituir columnas float[] por vector(1536); los datos previos en array se descartan (se reindexan con jobs)
ALTER TABLE "Idea" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "Idea" ADD COLUMN "embedding" vector(1536);

ALTER TABLE "File" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "File" ADD COLUMN "embedding" vector(1536);

-- Índice HNSW (cosine); pgvector >= 0.5
CREATE INDEX IF NOT EXISTS "Idea_embedding_hnsw_idx" ON "Idea" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "File_embedding_hnsw_idx" ON "File" USING hnsw ("embedding" vector_cosine_ops);
