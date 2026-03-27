# Idealow

Idealow es una app para **capturar ideas** desde texto y adjuntos (audio, imagen, vídeo, PDF, notas), y **transformarlas con IA** en un resultado más útil: título, resumen y estructura lista para iterar.

Incluye un flujo de “captura → extracción → sugerencias” y un dashboard con ideas recientes.

## Stack

### Frontend (`/frontend`)
- **React 19** + **Vite**
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query** (data-fetching/cache)
- **Zustand** (estado)
- **PWA** (`vite-plugin-pwa`)

### Backend (`/backend`)
- **Node.js** + **Express**
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL** (DB)
- **Azure OpenAI / Microsoft Foundry** (extracción y sugerencias)
- **JWT** (auth) + `cookie-parser`

## Estructura del repo
- `frontend/`: aplicación web (Vite) en `http://localhost:3000` (proxy a `/api`).
- `backend/`: API en `http://localhost:3001`.
- `docker-compose.yml` y `docker/postgres/`: PostgreSQL con **pgvector** para desarrollo local (ver sección de setup).

## Requisitos
- **Node.js 18+** (recomendado 20+)
- **Docker Desktop** (recomendado) para levantar PostgreSQL con **pgvector**, o un PostgreSQL propio con la extensión `vector` instalada
- Credenciales de **Azure OpenAI / Foundry** (obligatorias para arrancar el backend)

## Setup rápido (Windows / PowerShell)

### 1) Backend

Orden recomendado: **base de datos** → **dependencias y `.env`** → **Prisma** → **servidor**.

#### Paso A — Base de datos (Docker + pgvector, recomendado)

En la **raíz del repo**, `docker-compose.yml` levanta **PostgreSQL 16** con **`pgvector/pgvector`** (extensión `vector` para embeddings / búsqueda semántica).

1. Arranca **Docker Desktop** y espera a que el motor esté listo.
2. Desde la raíz del proyecto:

```bash
docker compose up -d
docker compose ps
```

Por defecto: **`localhost:5433`**, usuario / contraseña / base **`postgres`** / **`password`** / **`idealow`**. Los datos persisten en el volumen **`idealow_pgdata`** (no se pierden con `docker compose down` salvo `docker compose down -v`).

**Sin Docker:** PostgreSQL propio con **pgvector** y la misma idea en `DATABASE_URL`. Si “Connection refused” con Postgres en Windows: `services.msc` → `postgresql-x64-XX` → **Start**.

#### Paso B — Dependencias y `.env`

```bash
cd backend
npm install
copy .env.example .env
```

En `backend/.env` (obligatorias):

- **`DATABASE_URL`**: con Docker por defecto `postgresql://postgres:password@localhost:5433/idealow?schema=public`
- **`JWT_SECRET`**: cadena larga y aleatoria
- **`AZURE_OPENAI_ENDPOINT`**, **`AZURE_OPENAI_API_KEY`**, **`AZURE_OPENAI_DEPLOYMENT_CHAT`**
- **Embeddings:** **`AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS`** o **`EMBEDDING_MODEL`** (nombre del deployment en Azure)

#### Paso C — Aplicar esquema (Prisma)

Con la base levantada y `DATABASE_URL` correcta:

```bash
npm run db:generate
npm run db:migrate
```

#### Paso D — Arrancar el backend

```bash
npm run dev
```

El backend expone:
- `GET /health`
- API bajo `http://localhost:3001/api/*` (por ejemplo: `api/auth`, `api/ideas`, `api/files`, `api/validation`, `api/users`, `api/feed`)

### 2) Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:3000`.  
Vite tiene un proxy configurado para enviar `"/api"` a `http://localhost:3001`.

## Tests

### Backend

```bash
cd backend
npm test
```

## Notas de configuración

- **Puertos por defecto**:
  - Frontend: `3000`
  - Backend: `3001`
- **Uploads**: el backend guarda archivos en `UPLOAD_DIR` (por defecto `./uploads` dentro de `backend/`).

## Comandos útiles

### Docker (misma base que en el setup del backend)

```bash
# Desde la raíz del repo
docker compose up -d
docker compose down       # datos se conservan (volumen)
docker compose down -v    # borra también los datos de la base
```

Si cambias el puerto en `docker-compose.yml`, actualiza **`DATABASE_URL`** en `backend/.env`.

### Prisma (backend)

```bash
cd backend
npm run db:studio
```

## Licencia

Pendiente (no especificada).

