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

## Requisitos
- **Node.js 18+** (recomendado 20+)
- **PostgreSQL** (local o remoto)
- Credenciales de **Azure OpenAI / Foundry** (obligatorias para arrancar el backend)

## Setup rápido (Windows / PowerShell)

### Arrancar PostgreSQL (Windows, como servicio)

Si `psql`/pgAdmin te devuelve “Connection refused”, normalmente es porque **PostgreSQL no está arrancado**.

- Win+R → `services.msc`
- Busca un servicio tipo `postgresql-x64-XX`
- Clic derecho → **Start**

### 1) Backend

En una terminal:

```bash
cd backend
npm install
```

Crea tu `.env` a partir del ejemplo:

```bash
copy .env.example .env
```

Configura en `backend/.env` (variables **obligatorias**):
- **`DATABASE_URL`**: conexión a Postgres (ej. `postgresql://postgres:postgres@localhost:5432/idealow?schema=public`)
- **`JWT_SECRET`**: una cadena larga y aleatoria
- **`AZURE_OPENAI_ENDPOINT`**: `https://<recurso>.openai.azure.com` (sin `/openai` al final)
- **`AZURE_OPENAI_API_KEY`**
- **`AZURE_OPENAI_DEPLOYMENT_CHAT`**: nombre del *deployment* en Azure (no es el nombre del modelo)

Inicializa Prisma:

```bash
npm run db:generate
npm run db:migrate
```

Arranca el backend:

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

### Prisma (backend)

```bash
cd backend
npm run db:studio
```

## Licencia

Pendiente (no especificada).

