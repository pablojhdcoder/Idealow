# Guia de test manual end-to-end (Idealow)

Esta guia te dice **que probar** y **por donde ir** para validar las funcionalidades principales de la app de punta a punta.

## 1) Alcance funcional a cubrir

- Landing publica (`/`)
- Registro (`/register`) y login (`/login`)
- Onboarding (`/onboarding`)
- Dashboard (`/dashboard`)
- Captura de ideas con texto + adjuntos (`/ideas/new`)
- Listado de ideas, refinamiento, validacion y busqueda semantica (`/ideas`)
- Ficha/flashcard de idea (panel lateral)
- Publicacion de ideas al feed y despublicacion
- Feed comunidad (`/feed`) con filtros, orden y paginacion
- Votos y comentarios comunitarios
- Enlace publico de flashcard (`/flashcard/:id`)
- Perfil (`/profile`) y flujo de logout

## 2) Prerrequisitos

1. Backend y frontend levantados:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`
2. Base de datos migrada y operativa.
3. Variables de IA configuradas en `backend/.env` para chat/refinamiento.
4. Para semantica/similares: configurar embeddings (`AZURE_OPENAI_DEPLOYMENT_EMBEDDINGS` o `EMBEDDING_MODEL`).
5. Tener a mano documentos de prueba para adjuntar (puedes usar `docs-pack-capture-new-idea`).

## 3) Datos de prueba recomendados

- Usuario A: creador/publicador de ideas.
- Usuario B: usuario secundario para votar/comentar ideas de A.
- Idea base de prueba:
  - Texto en recuadro + 2-3 adjuntos (`.txt`, `.md`, `.pdf`).
  - Sector seleccionado (por ejemplo `tech`).

## 4) Recorrido recomendado (orden sugerido)

## Paso 0 - Sanidad tecnica

### Objetivo
Confirmar que app y API responden.

### Que hacer
1. Abrir `http://localhost:3000`.
2. Verificar que carga la landing.
3. Verificar salud backend en `http://localhost:3001/health`.

### Esperado
- Landing visible sin errores de consola bloqueantes.
- `/health` devuelve `{ "status": "ok" }`.

---

## Paso 1 - Registro y autenticacion

### Ruta
`/register` -> `/onboarding` -> `/dashboard`

### Casos positivos
1. Registrar Usuario A con email/username nuevos y password >= 8.
2. Confirmar redireccion a onboarding.
3. Cerrar sesion (menu usuario) y hacer login en `/login`.
4. Confirmar redireccion:
   - Si onboarding completo: `/dashboard`
   - Si onboarding incompleto: `/onboarding`

### Casos negativos
1. Intentar registrar con email ya existente.
2. Intentar login con password incorrecta.

### Esperado
- Errores claros en UI para credenciales invalidas/duplicadas.
- Sesion persistida por cookie (al refrescar sigue autenticado).

---

## Paso 2 - Onboarding

### Ruta
`/onboarding`

### Que hacer
1. Step 1: seleccionar 1-5 sectores.
2. Step 2: seleccionar experiencia.
3. Step 3: seleccionar objetivo.
4. Finalizar.

### Validaciones clave
- Boton `Next/Finish` deshabilitado si falta dato requerido del paso.
- Al terminar, redireccion a `/dashboard`.

### Esperado
- Perfil actualizado y usado por la app (por ejemplo sectores visibles en perfil).

---

## Paso 3 - Dashboard

### Ruta
`/dashboard`

### Que hacer
1. Ver widget `Capture a new idea`.
2. Revisar `Recent ideas` (vacio al inicio, luego con contenido).
3. Revisar sugerencias de prompts.
4. Abrir captura nueva desde boton principal y FAB.

### Esperado
- Navegacion correcta a `/ideas/new`.
- Sin bloqueos visuales ni errores al cargar sugerencias/listado.

---

## Paso 4 - Captura de idea con adjuntos

### Ruta
`/ideas/new`

### Casos positivos
1. Crear idea solo con texto.
2. Crear idea solo con adjuntos.
3. Crear idea con texto + adjuntos + sector.
4. Adjuntar varios archivos validos (incluye `.txt`, `.md`, `.pdf`).

### Casos negativos
1. Intentar continuar sin texto y sin archivos.
2. Intentar subir tipo no soportado (ej. `.exe`).
3. Intentar exceder maximo de archivos (12).
4. Intentar archivo muy grande (segun `maxUploadMb` del backend).

### Esperado
- Se muestran previews y contador de adjuntos.
- Mensajes de error correctos para validaciones.
- Al crear con exito redirige a `/ideas` y resalta la idea creada.

---

## Paso 5 - Mis ideas: refinamiento, validacion y semantica

### Ruta
`/ideas`

### A. Listado y estados
1. Ver que aparecen tarjetas de ideas con `DRAFT`, `REFINING`, `VALIDATED`.
2. Ver estadisticas (total, publicadas, borradores, con sector).

### B. Refinamiento
1. En idea `DRAFT`, pulsar `Refinar`.
2. Responder wizard de preguntas.
3. Completar flujo.

### Esperado refinamiento
- La idea cambia de estado (normalmente a `REFINING` y luego lista para validar).

### C. Validacion de mercado
1. En idea refinada, abrir `Validar mercado`.
2. Ver panel de progreso (SSE) y esperar final.

### Esperado validacion
- La idea termina en `VALIDATED` con score visible.
- Si falla por estado, mostrar mensaje tipo "Refine the idea before running validation".

### D. Busqueda semantica
1. Escribir termino semantico en buscador.
2. Ver resultados relevantes por significado.
3. Probar busqueda sin resultados.

### Esperado semantica
- Si embeddings configurados: resultados sin error.
- Si embeddings no configurados: mensaje informativo (503) en UI.

### E. Ideas relacionadas
1. Abrir `Ideas relacionadas` en una tarjeta.
2. Validar lista y comportamiento sin resultados.

---

## Paso 6 - Flashcard de idea y controles de publicacion

### Punto de entrada
Desde `/ideas` o `/feed`, boton `Ver ficha`.

### Que validar
1. Carga de secciones: idea, negocio, riesgos, validacion, competidores.
2. Anillo de score y etiquetas de sector/veredicto.
3. Como propietario y estado `VALIDATED`, usar switch de publicacion:
   - Publicar (confirm dialog)
   - Despublicar

### Esperado
- Al publicar, la idea aparece en `/feed`.
- Al despublicar, deja de aparecer en feed.
- Mensajes toast de exito/error coherentes.

---

## Paso 7 - Feed de comunidad

### Ruta
`/feed`

### Que hacer
1. Probar tabs/filtros:
   - Todas
   - Strong signal
   - Por score
   - Mas votadas
2. Probar filtro por sector.
3. Probar busqueda por texto.
4. Usar `Cargar mas` para paginacion.
5. Abrir ficha desde card del feed.

### Esperado
- Listado se actualiza segun filtros.
- Vacio controlado si no hay resultados.
- Sin duplicados al paginar.

---

## Paso 8 - Votos y comentarios (multiusuario)

### Preparacion
- Usuario A publica una idea validada.
- Usuario B inicia sesion.

### Que hacer con Usuario B
1. Abrir idea publicada en feed/ficha.
2. Votar (`useful`, `interesting`, `not useful`).
3. Enviar comentario (max 280).
4. Ver que contador/barra de votos cambia.
5. Ver comentario en lista.

### Casos de control
1. Usuario no autenticado intenta votar/comentar.
2. Usuario A (owner) intenta votar su propia idea.

### Esperado
- No autenticado: se solicita iniciar sesion para votar.
- Owner: no puede votar su propia idea.
- Datos de comunidad se refrescan en ficha/feed.

---

## Paso 9 - Enlace publico de flashcard

### Ruta
`/flashcard/:id`

### Que hacer
1. Desde feed, abrir `Abrir enlace publico`.
2. Probar `Copiar enlace`.
3. Abrir enlace en ventana privada/incognito.

### Esperado
- La ficha publica carga correctamente.
- Metadatos basicos para compartir (titulo/descripcion) actualizan segun la idea.

---

## Paso 10 - Perfil y ajustes

### Ruta
`/profile`

### Que hacer
1. Ver datos de cuenta (readonly email/username).
2. Revisar barra de completitud.
3. Ir a `Editar onboarding` y volver con cambios.
4. En preferencias:
   - toggles de notificaciones/privacidad
   - dialogo de restablecer preferencias

### Esperado
- Navegacion estable y estado UI consistente.
- No errores de render en tabs/dialog/switches.

---

## Paso 11 - Logout y proteccion de rutas

### Que hacer
1. Logout desde menu de usuario.
2. Intentar acceder manualmente a:
   - `/dashboard`
   - `/ideas`
   - `/ideas/new`
   - `/feed`
   - `/profile`

### Esperado
- Redireccion a `/login` para rutas privadas.
- Rutas publicas (`/`, `/flashcard/:id`) siguen accesibles.

## 5) Checklist rapido de cierre

Marca cada punto al finalizar:

- [ ] Registro, login y logout correctos
- [ ] Onboarding completo y persistente
- [ ] Captura de idea con texto
- [ ] Captura de idea con adjuntos validos
- [ ] Validaciones de error en captura (vacio/tipo/no soportado)
- [ ] Flujo refinamiento completo
- [ ] Flujo validacion completo con score
- [ ] Busqueda semantica funcionando o error 503 bien informado
- [ ] Publicar/despublicar idea validada
- [ ] Feed con filtros, busqueda y paginacion
- [ ] Votacion y comentarios como usuario no propietario
- [ ] Restriccion de voto para owner
- [ ] Enlace publico de flashcard funcional
- [ ] Perfil y preferencias sin errores
- [ ] Proteccion de rutas privadas confirmada

## 6) Evidencias recomendadas por caso

Para cada caso probado, guarda:
- Captura de pantalla del resultado.
- URL/ruta exacta.
- Usuario usado (A/B).
- Resultado esperado vs resultado real.
- Severidad si hay bug (`Bloqueante`, `Alta`, `Media`, `Baja`).

## 7) Plantilla de reporte de bug

- ID: `BUG-XXX`
- Modulo: `Auth | Ideas | Validation | Feed | Profile | Public link`
- Precondicion:
- Pasos:
- Resultado esperado:
- Resultado actual:
- Evidencia:
- Severidad:
