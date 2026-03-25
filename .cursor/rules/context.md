# Idealow — Quick Context

## Qué hace esta app
Captura ideas en cualquier formato (texto, audio, vídeo, imagen, URL),
las refina con un wizard guiado de 5 pasos, las valida contra fuentes
externas (Reddit, noticias RSS, YouTube/Shorts con cuota gratuita, pulso social amplio estimado solo con IA sin APIs de pago, tendencias y competidores con IA), y las guarda
como flashcards bonitas con score de validación. Opcionalmente se
publican en un feed comunitario donde otros usuarios votan y comentan.

## Stack
- Frontend:  Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend:   Express.js + TypeScript
- ORM:       Prisma
- DB:        PostgreSQL + extensión `pgvector` (única base de datos)
- Auth:      JWT propio (jsonwebtoken + bcryptjs) — sin Supabase Auth
- Storage:   Disco local en backend (`backend/uploads`) + metadatos en tabla `files`
- AI:        **Microsoft Foundry / Azure OpenAI** (SDK `openai` con `AzureOpenAI`; deployments en el recurso Azure)
- Embeddings: vectorización de ideas/archivos para búsqueda semántica y recomendaciones
- PWA:       vite-plugin-pwa (instalable en Android e iOS)
- Deploy:    CubePath (configurar más adelante, sin Docker por ahora)

## Puertos locales
- Frontend: http://localhost:3000
- Backend:  http://localhost:3001

## Modelo AI
- Configura **Azure OpenAI** vía `.env`: endpoint del recurso, `AZURE_OPENAI_API_KEY`, nombres de **deployment** (chat recomendado: `gpt-5.4-nano`; audio: `whisper`). Ver `backend/src/config/foundryModels.ts` y [Foundry Models](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure).
- Siempre devolver JSON estructurado — nunca prose directo al frontend

## Motor de validación — cobertura de fuentes
- **Reddit**: búsqueda JSON pública + análisis IA.
- **Noticias**: RSS de Google News (sin API key) + análisis IA (`validateNews`).
- **Social agregado** (`validateSocial`): **YouTube** + **Shorts** ([Data API v3](https://developers.google.com/youtube/v3), cuota gratuita con `YOUTUBE_API_KEY`) + **IA** con bloques sintéticos **X**, **Instagram** y **TikTok** (`ai_social_search`: señal 0–100 + texto; sin APIs de pago ni scraping). Sin [TikTok-Api](https://github.com/davidteather/tiktok-api) ni [Instagram Graph API](https://developers.facebook.com/products/instagram/apis/) en este repo — KISS.
- **Tendencias**: estimación IA (no es Google Trends API).
- **Competidores**: síntesis IA.
- Pesos en `backend/src/services/validation/aggregator.ts`. Documentación ampliada en `.cursor/commands/03_validation_engine.md`.

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
