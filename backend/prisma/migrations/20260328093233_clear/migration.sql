-- DropIndex
DROP INDEX "File_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "Idea_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "sectors" DROP DEFAULT;
