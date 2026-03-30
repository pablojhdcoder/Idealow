-- AlterTable
ALTER TABLE "Idea" ADD COLUMN "refinementConfirmedAt" TIMESTAMP(3);

-- Ideas que ya tienen validación persistida: equivalente a haber pasado por confirmación en flujos antiguos.
UPDATE "Idea"
SET "refinementConfirmedAt" = COALESCE("updatedAt", "createdAt")
WHERE "validationScore" IS NOT NULL OR "validationData" IS NOT NULL;
