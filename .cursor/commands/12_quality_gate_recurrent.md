# Command: Pre-Merge Quality Gate

## Task
Ejecutar una puerta de calidad completa antes de merge.

## Prompt
```text
Ejecuta una quality gate completa sobre este cambio antes de merge:

1) Code review tecnica (bugs/regresiones/deuda de alto impacto)
2) Security review (vulnerabilidades explotables)
3) Testing (tests clave + build)
4) Consistencia con reglas/documentacion de `.cursor`

Resultados esperados:
- Lista de bloqueantes (must-fix)
- Lista de no bloqueantes (nice-to-have)
- Cambios aplicados automaticamente (si procede)
- Estado final: READY / NOT READY para merge
- Test plan manual minimo

Si encuentras bloqueantes:
- Propone y aplica fix inmediato cuando sea posible
- Revalida despues del fix
```

## Checklist minimo a reportar
- Estado de build backend
- Estado de build frontend
- Estado de tests relevantes
- Riesgos residuales
