# Idealow — Quick Context

## Qué hace esta app
Captura ideas en cualquier formato (texto, audio, vídeo, imagen, URL),
las refina con un wizard guiado de 5 pasos, las valida contra fuentes
externas reales (Reddit, Trends, competidores, redes), y las guarda
como flashcards bonitas con score de validación. Opcionalmente se
publican en un feed comunitario donde otros usuarios votan y comentan.

## Stack
- Frontend:  Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend:   Express.js + TypeScript
- ORM:       Prisma
- DB:        PostgreSQL + extensión `pgvector` (única base de datos)
- Auth:      JWT propio (jsonwebtoken + bcryptjs) — sin Supabase Auth
- Storage:   Disco local en backend (`backend/uploads`) + metadatos en tabla `files`
- Queue:     BullMQ + Redis (jobs de validación async)
- AI:        **OpenRouter** (API compatible con OpenAI; modelos con variante **`:free`** o catálogo actual en [openrouter.ai/models?free=true](https://openrouter.ai/models?free=true))
- Embeddings: vectorización de ideas/archivos para búsqueda semántica y recomendaciones
- PWA:       vite-plugin-pwa (instalable en Android e iOS)
- Deploy:    CubePath (configurar más adelante, sin Docker por ahora)

## Puertos locales
- Frontend: http://localhost:3000
- Backend:  http://localhost:3001

## Modelo AI
- Usa **OpenRouter** en ajustes de modelo personalizado, base URL `https://openrouter.ai/api/v1` y API key de OpenRouter.
- Elige un modelo gratuito (sufijo `:free` o colección “Free” en OpenRouter). Los IDs cambian; revisa el catálogo si un modelo deja de estar disponible.
Siempre devolver JSON estructurado — nunca prose directo al frontend

## Orden de implementación
1. 00_setup         → estructura, dependencias, DB local
2. 05_auth          → auth JWT + onboarding
3. 01_new_idea      → captura y extracción de ideas
4. 02_wizard        → refinamiento guiado
5. 03_validation    → motor de validación async + SSE
6. 06_embeddings    → pgvector + indexación semántica + recomendaciones
7. 04_flashcard     → flashcards + feed comunitario

## Diseño
- Todo redondeado: cards=rounded-2xl, botones=rounded-full, sheets=rounded-3xl
- Colores: indigo #6366F1 (primary), amber #F59E0B (scores), #FAFAF8 (bg)
- Fuentes: Instrument Serif (display), DM Sans (body)
- Framer Motion en todos los elementos interactivos
- Skeleton loaders para todo el contenido async
- Mobile-first
- UI local estilo shadcn en `frontend/src/components/ui` (editable, sin libreria monolitica cerrada)

## Regla de oro
Ideas privadas por defecto. Publicar es siempre una decisión consciente del usuario.
