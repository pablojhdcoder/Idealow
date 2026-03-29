-- Register omite `sectors`; Prisma delega en el DEFAULT de la columna.
-- La migración `20260328093233_clear` hizo DROP DEFAULT y rompió INSERT de nuevos usuarios.
ALTER TABLE "User" ALTER COLUMN "sectors" SET DEFAULT ARRAY[]::TEXT[];
