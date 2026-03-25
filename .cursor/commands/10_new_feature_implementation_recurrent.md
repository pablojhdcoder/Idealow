# Command: New Feature Implementation

## Task
Implementar una funcionalidad nueva de forma end-to-end con validacion tecnica.

## Prompt
```text
Implementa esta nueva funcionalidad: ./03_validation_engine.md siempre teniendo en cuenta todo el contexto de la app y como integrarlo y utilizando todas las reglas de ../docs para seguir un buen diseño de software.

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
