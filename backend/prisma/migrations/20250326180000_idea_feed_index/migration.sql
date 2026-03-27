-- Feed: listar ideas publicadas ordenadas por fecha
CREATE INDEX IF NOT EXISTS "Idea_isPublished_publishedAt_idx" ON "Idea" ("isPublished", "publishedAt");
