## 🚀 Idealow

Idealow es una aplicación web para **capturar ideas en bruto**, **refinarlas con ayuda de IA** y **validarlas con señales reales de mercado**, con una **capa comunitaria** para compartir y descubrir ideas de otras personas.

- Captura desde texto libre y adjuntos (PDF, imagen, audio, vídeo, notas…).
- Extrae automáticamente el contenido relevante y genera un **título, resumen y estructura** listos para trabajar.
- Te guía con un **wizard de refinamiento** por pasos.
- Lanza una **validación de mercado asíncrona** que consulta distintas fuentes (YouTube, Reddit, noticias…) y calcula un score.
- Permite **publicar ideas validadas** en un feed comunitario, ver ideas de otras personas y descubrir ideas relacionadas mediante **búsqueda semántica**.

![Logo Idealow](assets/logo2.png)
![Logo CubePath](assets/logoCubePath.png)

---

## 🔗 Demo desplegada en CubePath

> **Sustituye esta URL por la de tu despliegue real en CubePath antes de registrar el proyecto.**

- **Demo (CubePath)**: `https://TU-DOMINIO.cubepath.app`

---

## 📸 Capturas / GIFs

> Añade aquí imágenes o GIFs de la app en funcionamiento (puedes arrastrarlas directamente en GitHub).

![Demo de Idealow](assets/finaldemo.gif)

- Vista de **dashboard** con ideas recientes.
- Flujo de **nueva idea** con adjuntos.
- **Wizard de refinamiento** (preguntas y respuestas).
- Pantalla de **validación de mercado** con progreso y resultados.
- **Feed comunitario** de ideas publicadas.

---

## 🧩 Funcionalidades principales

- **Autenticación y perfil**
  - Registro, login y logout con JWT en cookie `httpOnly`.
  - Onboarding inicial para seleccionar sectores de interés.
  - Edición de perfil (nombre, email, contraseña, foto) y preferencias de privacidad.

- **Captura de ideas**
  - Crear nuevas ideas con:
    - Texto libre.
    - Sector / categoría.
    - Adjuntos (PDF, imagen, audio, vídeo, otros documentos).
  - Los archivos se suben al backend, se procesan y se asocian a la idea.
  - Vista de **mis ideas** con listado, filtros básicos y estados.

- **Refinamiento guiado**
  - Wizard de refinamiento en varios pasos:
    - Preguntas generadas con IA según tu idea.
    - Respuestas del usuario que se integran en la idea.
    - Confirmación final del contenido refinado.
  - Cambio de estado de la idea cuando pasa por el refinamiento.

- **Validación de mercado**
  - Lanza una validación asíncrona de la idea.
  - Seguimiento de progreso via API (y SSE donde está soportado).
  - Fuentes externas como YouTube, Reddit y Google News para buscar señales de interés.
  - Cálculo de un **score de validación** y resumen de hallazgos.

- **Publicación y comunidad**
  - Marcar una idea como **publicada** para aparecer en el feed.
  - Feed público de ideas validadas con filtros y ordenación.
  - Vista tipo **flashcard** de la idea (título, resumen, puntos clave).
  - Descubrimiento de ideas relacionadas mediante **búsqueda semántica**.

- **Búsqueda semántica**
  - Generación de embeddings de ideas y archivos asociados.
  - Búsqueda por texto natural para encontrar ideas similares.

- **Gestión de archivos**
  - Subida de archivos con `multer` al backend.
  - Almacenamiento en disco y referencia en base de datos.
  - Acceso seguro a los archivos por UUID (solo usuario autorizado).

- **Seguridad y robustez**
  - Cookies `httpOnly`, `secure` en producción y configuración de CORS por origen.
  - Rate limiting en la API.
  - Separación de roles backend/frontend y validaciones de entrada.

---

## 🧱 Arquitectura y stack

- **Frontend (`/frontend`)**
  - **React 19** + **Vite**
  - **TypeScript**
  - **Tailwind CSS**
  - **TanStack Query** (data-fetching/cache)
  - **Zustand** (estado global, auth, UI)
  - SPA con React Router y rutas públicas/privadas.

- **Backend (`/backend`)**
  - **Node.js** + **Express**
  - **TypeScript**
  - **Prisma** (ORM)
  - **PostgreSQL** como base de datos principal
  - **pgvector** para embeddings y búsqueda semántica
  - **Azure OpenAI / Microsoft Foundry** (chat, extracción, validación, embeddings)
  - **JWT** (auth) + `cookie-parser`
  - SSE para streams de validación (donde aplique)

---

## 🗺️ Estructura del repositorio

- `frontend/`: aplicación web (Vite) sirviendo en `http://localhost:3000` (proxy a `/api`).
- `backend/`: API Express en `http://localhost:3001`.
- `docker-compose.yml` y `docker/postgres/`: PostgreSQL con **pgvector** para desarrollo local.

---

## ⚙️ Requisitos

- **Node.js 18+** (recomendado 20+)
- **Docker Desktop** (recomendado) para levantar PostgreSQL con **pgvector**, o un PostgreSQL propio con la extensión `vector` instalada.
- Credenciales de **Azure OpenAI / Foundry** (obligatorias para arrancar el backend).

---

## 💻 Cómo ejecutar el proyecto en local

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

Por defecto: **`localhost:5433`**, usuario / contraseña / base **`postgres`** / **`password`** / **`idealow`**.  
Los datos persisten en el volumen **`idealow_pgdata`** (no se pierden con `docker compose down` salvo que uses `docker compose down -v`).

> **Sin Docker:** también puedes usar un PostgreSQL propio con **pgvector** y la misma idea en `DATABASE_URL`.

#### Paso B — Dependencias y `.env`

```bash
cd backend
npm install
copy .env.example .env
```

En `backend/.env` (obligatorias):

- `DATABASE_URL`: con Docker por defecto `postgresql://postgres:password@localhost:5433/idealow?schema=public`
- `JWT_SECRET`: cadena larga y aleatoria
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_CHAT`
- Embeddings: `AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS` o `EMBEDDING_MODEL` (nombre del deployment en Azure)

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
- API bajo `http://localhost:3001/api/*` (por ejemplo: `api/auth`, `api/ideas`, `api/files`, `api/validation`, `api/users`, `api/feed`, `api/semantic`)

### 2) Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:3000`.  
Vite tiene un proxy configurado para enviar `"/api"` a `http://localhost:3001`.

---

## 🧪 Tests

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## ☁️ Cómo se utiliza CubePath en este proyecto

- El **backend** (API de Express) se despliega como un servicio en CubePath.
- El **frontend** (Vite + React) se construye y se sirve detrás del mismo dominio, utilizando un **reverse proxy** que redirige las rutas `/api/*` hacia el backend.
- La base de datos **PostgreSQL + pgvector** se ejecuta como servicio gestionado o como contenedor propio, accesible desde el backend desplegado en CubePath.
- La configuración de CORS, `TRUST_PROXY` y cookies `secure` se ajusta para que:
  - La cookie JWT sea **`httpOnly`** y segura en producción.
  - Solo el dominio de CubePath pueda acceder a la API.
- Los assets subidos (carpeta `uploads`) se almacenan en un volumen persistente accesible por el servicio backend en CubePath.

> En el formulario `project.yml` de la hackatón se describe brevemente el **dominio de CubePath**, la **URL del repositorio** y un resumen de cómo se ha hecho este despliegue.

---

## 📌 Notas adicionales

- **Puertos por defecto en local**:
  - Frontend: `3000`
  - Backend: `3001`
- **Uploads**: el backend guarda archivos en `UPLOAD_DIR` (por defecto `./uploads` dentro de `backend/`).

---

## 📄 Licencia

Pendiente (no especificada).

