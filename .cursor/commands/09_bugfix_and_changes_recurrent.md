# Command: Bugfix and Directed Changes

## Task
Corregir bugs o aplicar cambios concretos con bajo riesgo de regresion.

## Prompt (bugfix)
```text
[bug]
Quiero que:
1) Encuentres causa raiz real.
2) Expliques por que ocurre (breve y tecnico).
3) Apliques un fix minimo y seguro (sin refactor gigante).
4) Agregues test que falle antes y pase despues.
5) Verifiques que no rompe flujos adyacentes.

Devuelveme:
- Root cause
- Archivos tocados
- Evidencia de validacion (test/build)
- Riesgos residuales
```

## Prompt (cambio/refactor controlado)
```text
Necesito un cambio en esta funcionalidad manteniendo comportamiento funcional.

Objetivo:
- Reducir complejidad
- Mejorar nombres/API interna
- Mantener contratos actuales

Limites:
- Cambios incrementales
- Sin reescritura total
- Sin alterar arquitectura global

Entrega:
1) Plan corto por pasos
2) Cambios aplicados
3) Validaciones ejecutadas
4) Impacto y pendientes
```
