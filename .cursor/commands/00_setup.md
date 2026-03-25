# Command: Project Setup

## Task
Inicializar el proyecto completo desde cero — frontend Vite+React y backend Express+TypeScript con PostgreSQL vía Prisma.

---

## 1. Estructura de carpetas

```bash
mkdir idealow && cd idealow
```

---

## 2. Inicializar Frontend

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# UI + Animaciones
npx shadcn@latest init
npm install framer-motion

# Estado + Data fetching
npm install zustand @tanstack/react-query

# Router
npm install react-router-dom

# Forms + Validación
npm install react-hook-form zod @hookform/resolvers

# Uploads al backend
npm install multer

# Rich text
npm install @tiptap/react @tiptap/starter-kit

# Icons
npm install lucide-react

# PWA
npm install -D vite-plugin-pwa
```

### shadcn components
```bash
npx shadcn@latest add button card dialog sheet badge avatar
npx shadcn@latest add input textarea label separator progress
npx shadcn@latest add dropdown-menu popover tooltip skeleton
npx shadcn@latest add toast sonner switch tabs scroll-area
```

### `frontend/vite.config.ts`
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Idealow',
        short_name: 'Idealow',
        description: 'Captura, refina y valida tus ideas',
        theme_color: '#6366F1',
        background_color: '#FAFAF8',
        display: 'standalone',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

### `frontend/tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

### `frontend/src/index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:      #FAFAF8;
  --surface: #FFFFFF;
  --primary: #6366F1;
  --accent:  #F59E0B;
  --text:    #1C1C1E;
  --muted:   #6B7280;
  --border:  #E5E7EB;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

---

## 3. Inicializar Backend

```bash
cd ../
mkdir backend && cd backend
npm init -y

# Express + TypeScript
npm install express cors helmet dotenv cookie-parser
npm install jsonwebtoken bcryptjs
npm install @prisma/client
npm install openai axios zod
npm install -D typescript ts-node nodemon @types/node
npm install -D @types/express @types/cors @types/jsonwebtoken
npm install -D @types/bcryptjs @types/cookie-parser

# Prisma
npx prisma init
```

Instala `pgvector` en PostgreSQL:
- Mac (Homebrew Postgres): `brew install pgvector`
- Linux: `sudo apt install postgresql-15-pgvector` (ajusta versión)
- Windows: usa instalador oficial de pgvector para tu versión de PostgreSQL

### `backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `backend/package.json` scripts
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

### `backend/src/config.ts`
```ts
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port:              process.env.PORT || 3001,
  databaseUrl:       process.env.DATABASE_URL!,
  jwtSecret:         process.env.JWT_SECRET!,
  // Azure OpenAI / Microsoft Foundry
  azureOpenAIEndpoint:        process.env.AZURE_OPENAI_ENDPOINT!,
  azureOpenAIApiKey:          process.env.AZURE_OPENAI_API_KEY!,
  openaiApiVersion:           process.env.OPENAI_API_VERSION || '2024-12-01-preview',
  azureOpenAIDeploymentChat:  process.env.AZURE_OPENAI_DEPLOYMENT_CHAT!,
  // Opcional: deployments por tarea (fallback a CHAT)
  azureOpenAIDeploymentExtraction:  process.env.AZURE_OPENAI_DEPLOYMENT_EXTRACTION,
  azureOpenAIDeploymentSuggestions: process.env.AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS,
  azureOpenAIDeploymentVision:      process.env.AZURE_OPENAI_DEPLOYMENT_VISION,
  azureOpenAIDeploymentWhisper:     process.env.AZURE_OPENAI_DEPLOYMENT_WHISPER,
  uploadDir:         process.env.UPLOAD_DIR || './uploads',
  maxUploadMb:       Number(process.env.MAX_UPLOAD_MB || 25),
  youtubeApiKey:     process.env.YOUTUBE_API_KEY || '',
  nodeEnv:           process.env.NODE_ENV || 'development',
}
```

### `backend/src/index.ts`
```ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config'
import authRoutes       from './routes/auth'
import ideasRoutes      from './routes/ideas'
import validationRoutes from './routes/validation'
import usersRoutes      from './routes/users'
import feedRoutes       from './routes/feed'
import { errorHandler } from './middleware/errors'

const app = express()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth',       authRoutes)
app.use('/api/ideas',      ideasRoutes)
app.use('/api/validation', validationRoutes)
app.use('/api/users',      usersRoutes)
app.use('/api/feed',       feedRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`)
})
```

---

## 4. Base de datos — PostgreSQL local

Instala PostgreSQL localmente si no lo tienes:
- Mac: `brew install postgresql@15 && brew services start postgresql@15`
- Windows: descarga el instalador de postgresql.org
- Linux: `sudo apt install postgresql`

Crea la base de datos:
```bash
psql -U postgres -c "CREATE DATABASE idealow;"
```

Añade al `backend/.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/idealow
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=
# Opcional (si no se definen, se usa CHAT):
# AZURE_OPENAI_DEPLOYMENT_EXTRACTION=
# AZURE_OPENAI_DEPLOYMENT_SUGGESTIONS=
# AZURE_OPENAI_DEPLOYMENT_VISION=
# AZURE_OPENAI_DEPLOYMENT_WHISPER=
EMBEDDING_MODEL=text-embedding-3-small
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=25
```

Aplica el schema:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

Habilita la extensión vector:
```bash
psql -U postgres -d idealow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## 5. Primera ejecución

Terminal 1 — Backend:
```bash
cd backend && npm run dev
# → http://localhost:3001/health debe responder { status: "ok" }
```

Terminal 2 — Frontend:
```bash
cd frontend && npm run dev
# → http://localhost:3000
```

---

## Checklist de arranque
- [ ] `http://localhost:3001/health` responde OK
- [ ] `http://localhost:3000` carga la app
- [ ] `npx prisma studio` abre el explorador de DB
- [ ] PostgreSQL corriendo localmente
- [ ] Todas las env vars rellenadas en `backend/.env` y `frontend/.env`
