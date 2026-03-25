# Command: Recurrent Code Review

## Task
Realiza una revision de codigo profunda y accionable sobre los cambios actuales o sobre un modulo especifico.

## Prompt
```text
Actua como Senior Engineer y haz una revision tecnica rigurosa.

Contexto del proyecto:
- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + Prisma + PostgreSQL
- Auth: JWT propio
- AI: Azure

Objetivo:
1) Detectar bugs reales, edge cases y regresiones probables.
2) Detectar deuda tecnica relevante (solo la que impacta mantenimiento/escala).
3) Proponer fixes concretos y, si es viable, aplicarlos.

Criterios:
- Prioriza impacto real y severidad.
- No des feedback generico ni de estilo superficial.
- Considera consistencia con `.cursor/rules/context.md` y `.cursor/rules/frontend-ui-standards.md`.

Formato de salida:
- Critical / High / Medium / Low
- Para cada hallazgo: archivo, problema, impacto, solucion propuesta.
- Cierre: cambios aplicados + pendientes + test plan minimo.
```

## Opcional (scope dirigido)
```text
Scope: revisar solo `backend/src/routes/ideas.ts` y dependencias directas.
```
