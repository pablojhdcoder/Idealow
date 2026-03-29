# Despliegue en CubePath (Idealow)

CubePath ofrece infraestructura tipo VPS (IaaS). **Idealow** no usa Docker en el repo actual: el despliegue es **Node.js + PostgreSQL + estáticos del frontend**, normalmente detrás de **HTTPS** y un **reverse proxy** (nginx, Caddy, etc.) en el mismo servidor o en un balanceador.

Este documento recoge lo que **debes** configurar para que auth (JWT en cookie), CORS, uploads, SSE de validación y cabeceras de seguridad funcionen en producción.

---

## 1. Arquitectura recomendada

| Pieza | Rol |
|--------|-----|
| **Frontend** | Build estático (`frontend/dist/`): HTML/JS/CSS/PWA. |
| **Backend** | API Express en `backend` (`npm run build` → `node dist/index.js`). |
| **PostgreSQL** | Base única; extensión `pgvector` para embeddings. |
| **Almacenamiento** | Directorio persistente para `UPLOAD_DIR` (subidas de archivos). |

**Origen único (recomendado):** el cliente usa rutas relativas (`/api/...`). Para que las cookies `httpOnly` y `credentials: 'include'` funcionen sin reescribir el frontend, sirve el SPA y el API **bajo el mismo esquema y host** (p. ej. `https://app.tudominio.com`), con el proxy enviando `/api` al backend.

Si en el futuro expusieras el API en otro subdominio, habría que añadir una base URL configurable (`VITE_*`) en el cliente y alinear `CORS_ORIGIN`; **no está implementado** en el código actual.

---

## 2. Base de datos

1. Crea una instancia **PostgreSQL** (versión compatible con Prisma del proyecto).
2. Habilita la extensión vectorial **una vez** (como superusuario o con permisos):

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Define `DATABASE_URL` en el entorno del backend (URL de conexión, con SSL si el proveedor lo exige).
4. Aplica migraciones en producción (no uses `migrate dev` en el servidor):

   ```bash
   cd backend
   npm ci
   npm run db:generate
   npx prisma migrate deploy
   ```

5. Verifica que el índice IVFFlat u otros recomendados en las reglas del proyecto estén cubiertos por las migraciones existentes.

---

## 3. Variables de entorno del backend

Fichero `.env` en el servidor (o secretos del panel de CubePath), **nunca** commiteado.

### Obligatorias (arranque)

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` (activa cookies `Secure`, mensajes de error acotados, CSP en API JSON). |
| `DATABASE_URL` | URL de PostgreSQL. |
| `JWT_SECRET` | Secreto largo y aleatorio (p. ej. `openssl rand -hex 32`). |
| `AZURE_OPENAI_ENDPOINT` | Endpoint del recurso Azure OpenAI / Foundry (sin barra final). |
| `AZURE_OPENAI_API_KEY` | Clave del recurso. |
| `AZURE_OPENAI_DEPLOYMENT_CHAT` | Nombre del deployment de chat. |
| `OPENAI_API_VERSION` | P. ej. `2024-12-01-preview` si aplica. |

### CORS y cookies

| Variable | Descripción |
|----------|-------------|
| `CORS_ORIGIN` | Origen(es) del SPA, **lista separada por comas**, coincidente con la URL pública (p. ej. `https://app.tudominio.com`). Sin esto, el fallback por defecto es solo localhost y el backend lo advertirá en logs. |

### Proxy y rate limiting

| Variable | Descripción |
|----------|-------------|
| `TRUST_PROXY` | `1` o `true` si el Node va **detrás** de nginx/Caddy/load balancer; necesario para que `express-rate-limit` use la IP real del cliente. Si no, el límite puede agrupar todo el tráfico en una IP. |

### Opcionales según features

| Variable | Descripción |
|----------|-------------|
| `JWT_ISSUER` / `JWT_AUDIENCE` | Si no se definen, se usan los valores por defecto del código (`idealow2-backend` / `idealow2-frontend`). Cambiarlos implica invalidar tokens existentes. |
| `PORT` | Puerto donde escucha Express (p. ej. `3001`); el proxy lo redirige desde 443. |
| `UPLOAD_DIR` | Ruta absoluta o relativa a un **volumen persistente** (p. ej. `/var/lib/idealow/uploads`). |
| `MAX_UPLOAD_MB` | Tope de subida; el backend lo acota también al límite razonable para IA. |
| `YOUTUBE_API_KEY` | Para validación social con YouTube Data API v3. |
| `AZURE_OPENAI_DEPLOYMENT_*` | Extraer, sugerencias, visión, whisper, embeddings según despliegues en Azure. |
| `JWT_SECRET` | Rotar si se filtra; todos los usuarios deberán volver a iniciar sesión. |

---

## 4. Build y ejecución del backend

```bash
cd backend
npm ci
npm run build
NODE_ENV=production node dist/index.js
```

En producción usa **process manager** (systemd, PM2, etc.) con reinicio automático y logs rotados.

**Health check:** `GET /health` → `{ "status": "ok" }` para balanceadores y monitorización.

---

## 5. Build del frontend

```bash
cd frontend
npm ci
npm run build
```

El resultado está en `frontend/dist/`. Sirve ese directorio como raíz del sitio estático.

- **Source maps:** el build de Vite puede generar `.map`; en producción suele desactivarse o no exponerse públicamente para no filtrar código fuente (ver checklist de seguridad al final).

---

## 6. Reverse proxy (mismo origen)

El proxy debe:

1. **TLS** terminado en 443 (Let’s Encrypt u otro certificado).
2. Servir archivos estáticos desde `dist/` para rutas que no sean API.
3. Enviar `location /api` (y opcionalmente `/health` si quieres exponerlo solo internamente) al backend.

### Validación SSE

El stream `GET /api/validation/ideas/:id/validate/stream` necesita:

- `proxy_buffering off` (o equivalente).
- Timeouts largos en el proxy (la conexión puede mantenerse abierta).
- Cabeceras `Cache-Control: no-cache` y `X-Accel-Buffering: no` (el backend ya las envía; el proxy no debe bufferizar el cuerpo).

Ejemplo de **ideas** para nginx (ajusta rutas y `upstream`):

```nginx
upstream idealow_api {
  server 127.0.0.1:3001;
  keepalive 32;
}

server {
  listen 443 ssl http2;
  server_name app.tudominio.com;

  # ssl_certificate / ssl_certificate_key ...

  root /var/www/idealow/dist;
  index index.html;

  location /api/ {
    proxy_pass http://idealow_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Con **Caddy** u otros, aplica las mismas ideas: sin buffer en SSE, reenvío de headers y `X-Forwarded-*`.

---

## 7. Cabeceras de seguridad en el SPA

El backend Express usa **Helmet** con JSON en producción; el **HTML del SPA** lo sirve el proxy o el CDN. Añade al menos en el **servidor estático**:

| Cabecera | Propósito |
|----------|-----------|
| `Strict-Transport-Security` | Forzar HTTPS (ajusta `max-age` y `includeSubDomains` según política). |
| `X-Content-Type-Options: nosniff` | Reduce MIME sniffing. |
| `X-Frame-Options: DENY` o `SAMEORIGIN` | Clickjacking. |
| `Referrer-Policy` | P. ej. `strict-origin-when-cross-origin`. |
| `Content-Security-Policy` | Partir de `default-src 'self'` y ampliar solo lo necesario (fuentes, `img-src` para avatares/API, etc.). |

Ajusta la CSP si cargas scripts desde fuentes externas o fuentes de Google Fonts.

---

## 8. Checklist pre-producción

- [ ] `NODE_ENV=production` y `JWT_SECRET` fuerte y único.
- [ ] `CORS_ORIGIN` coincide exactamente con la URL del SPA (incluido `https`, sin barra final si el código de lista no la añade).
- [ ] `TRUST_PROXY` activado si hay proxy delante.
- [ ] PostgreSQL con `vector` y `prisma migrate deploy` ejecutado.
- [ ] `UPLOAD_DIR` en disco persistente y con permisos de escritura del usuario que ejecuta Node.
- [ ] HTTPS en todo el tráfico de usuario; cookies ya usan `Secure` en producción.
- [ ] `.env` y `.git` no expuestos por el servidor web.
- [ ] Probar login, subida de archivo, validación con SSE y feed en el dominio real.
- [ ] Revisar logs del backend al arrancar: si solo aparece localhost en `CORS_ORIGIN`, corregir antes de abrir al público.

---

## 9. Referencias internas

- Variables detalladas en `.cursor/rules/rules` (sección Environment Variables).
- Seguridad de despliegue: `.cursor/skills/vibe-security/references/deployment.md`.
- Motor de validación: `.cursor/commands/03_validation_engine.md`.

Si CubePath cambia el flujo (CLI, plantillas o marketplace), adapta los comandos de build y arranque a su documentación oficial, manteniendo este checklist como contrato de la aplicación Idealow.
