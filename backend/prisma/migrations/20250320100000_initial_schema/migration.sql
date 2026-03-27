-- Esquema base (antes de pasar embeddings a pgvector).
-- La migración siguiente sustituye embedding float[] por vector(1536).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "sectors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "experienceLevel" TEXT NOT NULL DEFAULT 'BEGINNER',
    "goal" TEXT NOT NULL DEFAULT 'SIDE_PROJECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "rawContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sector" TEXT,
    "refinedContent" JSONB,
    "embedding" double precision[] NOT NULL DEFAULT ARRAY[]::double precision[],
    "validationScore" INTEGER,
    "validationData" JSONB,
    "competitors" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT,
    "filepath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sourceText" TEXT,
    "embedding" double precision[] NOT NULL DEFAULT ARRAY[]::double precision[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "File_userId_createdAt_idx" ON "File"("userId", "createdAt");
CREATE INDEX "File_ideaId_idx" ON "File"("ideaId");

ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IdeaFeedback" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdeaFeedback_ideaId_userId_key" ON "IdeaFeedback"("ideaId", "userId");

ALTER TABLE "IdeaFeedback" ADD CONSTRAINT "IdeaFeedback_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdeaFeedback" ADD CONSTRAINT "IdeaFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
