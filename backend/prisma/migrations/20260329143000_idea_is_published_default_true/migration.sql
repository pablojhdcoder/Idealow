-- Las ideas nuevas pasan a estar marcadas como publicables en comunidad por defecto
-- (la visibilidad real para terceros sigue exigiendo validación en aplicación).
ALTER TABLE "Idea" ALTER COLUMN "isPublished" SET DEFAULT true;
