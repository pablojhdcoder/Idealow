# Command: New Feature Implementation

## Task
Implementar una funcionalidad nueva de forma end-to-end con validacion tecnica.

## Prompt
```text
Implementa esta nueva funcionalidad: 
 En la pantalla de detalle de una idea quiero que añadas una funcionalidad que te permita validar la idea externamente, es decir, que te permita compartirla en sitios externos, ya sea, en correo, en WhatsApp en alguna otra red social etc, para ello quiero que esta opción comparta el link o enlace público que ya hay implementado en el feed o comunidad de la aplicación, quiero que este enlace público que ahora está bajo el endpoint de /flashcard quiero que sea muy distinto a como es ahora, yo había pensado en una flashcard (que tenga una preview de la idea) acompañada de algo de texto que incite al usuario a registrarse, cuando el usuario pulse en la flahcard (habrá que incitarle de alguna manera) ahí si que de verdad va a aparecer lo que hay actualmente en el enlace público.
 
 Siempre teniendo en cuenta todo el contexto de la app y como integrarlo y utilizando todas las reglas de ../docs para seguir un buen diseño de software. Y sobre todo las reglas en ../rules/frontend-ui-standards.md para hacer un diseño moderno, minimalista y redondeado acorde con el resto de la aplicación.

Antes de codificar:
1) Resume requisitos y supuestos.
2) Propone diseno corto (datos, API, frontend, errores).

Durante implementacion:
3) Implementa end-to-end (backend + frontend si aplica).
4) Incluye validacion de input, manejo de errores y estados de carga.
5) Mantiene consistencia con:
   - `.cursor/rules/context.md`
   - `.cursor/rules/frontend-ui-standards.md`

Calidad:
6) Agrega tests clave (happy path + edge cases).
7) Ejecuta build/tests y corrige fallos.

Entrega final:
- Que se implemento
- Archivos modificados
- Como probar manualmente
- Limitaciones y siguientes pasos
```
