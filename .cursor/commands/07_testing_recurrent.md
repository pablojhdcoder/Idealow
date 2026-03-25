# Command: Recurrent Testing

## Task
Validar una feature con tests de alto valor y ejecutar verificacion completa.

## Prompt
```text
Quiero que pruebes esta funcionalidad con enfoque en riesgo real, no en cobertura vacia.

Haz esto:
1) Identifica que SI merece test (servicios, handlers, validacion, edge cases).
2) Escribe tests con patron Arrange-Act-Assert.
3) Mockea APIs externas/LLM en el borde de modulo.
4) Ejecuta tests y reporta resultados.
5) Si hay fallos, aplica fix y rerun.

Referencias de apoyo:
- `.cursor/docs/engineering/testing.md`
- `.cursor/rules/context.md`

Prioriza:
- Auth y autorizacion en rutas
- Validacion de payloads (Zod/schemas)
- Servicios de negocio
- Interacciones criticas de frontend (sin snapshots fragiles)

Entrega:
- Archivos de test creados/modificados
- Resultado de ejecucion
- Riesgos no cubiertos y por que
```

## Comandos sugeridos de verificacion
- `cd backend && npm run test`
- `cd frontend && npm run test`
- `cd backend && npm run build`
- `cd frontend && npm run build`
