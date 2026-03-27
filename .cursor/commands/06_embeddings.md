# Command: Embeddings + pgvector + búsqueda semántica

## Task
Implementar **indexación vectorial real** con PostgreSQL + extensión `pgvector`, generación de embeddings vía **Azure OpenAI** (mismo patrón que el resto del backend), y APIs para búsqueda semántica, similitud y recomendaciones. Consumir desde dashboard, lista de ideas y (cuando exista) vistas tipo flashcard.

---

## Estado actual del repo (referencia)

| Área | Qué hay hoy |
|------|-------------|
| **Schema Prisma** | `Idea.embedding` y `File.embedding` como `Float[] @default([])` — reserva de campo, **no** tipo `vector` ni índices IVFFlat. |
| **Extension DB** | No hay migración/SQL con `CREATE EXTENSION vector` en el repositorio. |
| **Backend** | No hay servicios ni rutas que llamen a embeddings; no existe `GET /api/semantic/...`. |
| **Azure** | `getAzureOpenAIClient()` en `backend/src/lib/azureOpenAI.ts` listo para añadir `client.embeddings.create(...)`. |
| **Reglas** | Objetivos y fase resumidos en `.cursor/rules/rules` → sección «Embeddings y pgvector». |
| **Orden de roadmap** | `context.md`: fase **6** `06_embeddings` → después de `03_validation`, **antes** de `04_flashcard`. |

Hasta completar esta fase, las columnas vectoriales pueden permanecer vacías sin romper el flujo actual.

---

## Orden en el roadmap

```
… → 03_validation → 06_embeddings → 04_flashcard → …
```

**Por qué antes del feed/flashcards:** las recomendaciones «ideas relacionadas» y búsqueda semántica en el dashboard encajan aquí; el feed comunitario (`04`) puede reutilizar embeddings más adelante (p. ej. «similares en la comunidad») pero no es bloqueante para publicar/votar.

---

## Objetivos funcionales

1. **Búsqueda semántica** en las ideas del usuario autenticado (texto natural → ranking por similitud).
2. **Detección de similitud** al crear o actualizar una idea (aviso opcional: «ya tienes algo parecido»).
3. **Recomendaciones** en dashboard (y componentes de idea): top-k ideas del mismo usuario ordenadas por distancia coseno respecto a la idea actual o a la consulta.

Privacidad: **nunca** mezclar vectores de distintos `userId` en las consultas de similitud (salvo endpoints explícitos y públicos documentados).

---

## Filosofía KISS

- Un solo deployment de embeddings en Azure (p. ej. `text-embedding-3-small`, 1536 dimensiones) — alinear nombre en `.env` con el deployment real.
- Reutilizar `getAzureOpenAIClient()`; el modelo en cada llamada es el **nombre del deployment** en Azure.
- Tras escribir el vector en BD, las consultas de similitud son **SQL raw** con el operador de pgvector (`<=>` distancia coseno o `<->` L2 según se configure) porque Prisma no expresa bien los tipos `vector` en todas las versiones.
- Jobs «en background» pueden ser **funciones async invocadas sin bloquear la respuesta HTTP** (no hace falta Redis al inicio): `void enqueueEmbeddingForIdea(id)` con manejo de errores y logs.

---

## Base de datos

### 1. Extensión

En la base PostgreSQL (una vez por entorno):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Incluirlo en migraciones gestionadas o en script de provisionamiento del proyecto.

### 2. Modelo de datos

**Opción recomendada (alineada con pgvector):** columnas nativas `vector(1536)` mapeadas en Prisma como `Unsupported("vector(1536)")` **o** mantener compatibilidad intermedia almacenando el vector como texto/bytes según versión de Prisma — la documentación oficial de Prisma sobre [PostgreSQL extensions](https://www.prisma.io/docs/orm/prisma-schema/postgresql-extensions) y pgvector debe consultarse para la versión exacta del proyecto.

**Sustituir** los `Float[]` actuales por el tipo vectorial acordado; si se migra desde arrays vacíos, script de migración de datos o regeneración de embeddings tras el deploy.

### 3. Índices

- **IVFFlat** (o **HNSW** si la versión de pgvector y el volumen lo justifican) sobre `Idea.embedding` con lista ajustada al tamaño de datos de test/producción.
- Filtrar siempre por `userId` en la cláusula `WHERE` para aislamiento; el índice compuesto o partial index puede valorarse cuando haya volumen.

### 4. Texto fuente para embedding

- **Idea:** concatenar título, resumen y fragmentos relevantes de `refinedContent` (JSON) en un único string estable (orden fijo) para que re-embeddings sean reproducibles.
- **File:** usar `sourceText` cuando exista (transcripción/extracción ya generada en el pipeline de medios).

---

## Backend — servicios

### Archivos sugeridos

| Ruta | Responsabilidad |
|------|-----------------|
| `backend/src/services/embeddings/textForIdea.ts` | Construir string canónico desde `Idea` + `refinedContent`. |
| `backend/src/services/embeddings/generateEmbedding.ts` | Llamada a Azure OpenAI `embeddings.create`, validar dimensión. |
| `backend/src/services/embeddings/embeddingJob.ts` | `scheduleIdeaEmbedding(ideaId)`, `scheduleFileEmbedding(fileId)` — reintentos suaves, logs. |
| `backend/src/services/embeddings/similarity.ts` | `prisma.$queryRaw` con vector y top-k. |

### Hooks de negocio

Invocar el job (sin bloquear) cuando:

- Se crea o actualiza una idea con contenido que afecte al texto canónico.
- Se adjunta o actualiza un archivo con `sourceText` nuevo.

Opcional: cola futura si el volumen de re-embeddings lo exige.

---

## Backend — rutas HTTP

Convenciones alineadas con `.cursor/docs/engineering/api-design.md`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/semantic/search?q=...&limit=...` | Búsqueda semántica en ideas del **usuario actual** (requiere auth). |
| `GET` | `/api/ideas/:id/similar?limit=...` | Top-k ideas del mismo usuario similares a `:id` (requiere auth y ownership). |

Respuestas envueltas en objeto (`{ ideas: [...] }` o `{ items: [...] }`) coherente con el resto de la API; códigos `401` / `403` / `404` según corresponda.

**No** exponer vectores crudos al cliente salvo necesidad de debug (y nunca en producción sin autenticación fuerte).

---

## Variables de entorno

Añadir (y documentar en `README` / `rules` del backend):

```env
# Deployment en Azure para el modelo de embeddings (nombre del deployment, no solo el id del modelo OpenAI)
AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS=text-embedding-3-small
```

Opcional: `EMBEDDING_DIMENSIONS=1536` para validar en runtime.

Extender `backend/src/config/env.ts` y `config.ts` para leer `AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS` y usarlo en `generateEmbedding`.

---

## Frontend

- Barra de búsqueda en **Ideas** o **Dashboard** que llame a `GET /api/semantic/search` con debounce.
- Sección «Relacionadas» en la vista de detalle de idea usando `GET /api/ideas/:id/similar`.
- Estados de carga con skeletons (patrón ya definido en `context.md`).

Rutas y componentes exactos deben seguir el árbol actual bajo `frontend/src/` (imports `@/`).

---

## Seguridad y límites

- Rate limiting en rutas de búsqueda (mismo criterio que otras rutas costosas).
- Cada query SQL debe incluir `userId = $authenticatedUserId` para ideas privadas.
- Ideas publicadas en el feed: si más adelante se busca «similares en la comunidad», diseñar endpoint separado y políticas explícitas (solo metadata pública).

---

## Checklist de implementación

- [ ] Extensión `vector` activa en PostgreSQL.
- [ ] Schema y migración: columnas `vector(1536)` + índice adecuado.
- [ ] `AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS` y generación de embeddings verificada con una idea de prueba.
- [ ] Jobs tras crear/actualizar idea y archivos con texto.
- [ ] Endpoints `semantic/search` e `ideas/:id/similar` con Zod/query validation.
- [ ] Tests mínimos en servicios de similitud (mock de DB o integración con DB de test).
- [ ] UI: búsqueda + bloque de relacionadas.

---

## Referencias cruzadas

- Orden de fases: `.cursor/rules/context.md`
- Especificación breve: `.cursor/rules/rules` (sección embeddings)
- API REST deseada: `.cursor/docs/engineering/api-design.md`
- Feed y flashcards (fase siguiente en UX): `.cursor/commands/04_flashcard_community.md`
- Cliente Azure: `backend/src/lib/azureOpenAI.ts`
