# Command: Bugfix and Directed Changes

## Task
Corregir bugs o aplicar cambios concretos con bajo riesgo de regresion.

## Prompt (bugfix)
```text

Parece ser que cuando se solicita el dashboard el backend manda una solicitud de suggestions a un modelo de IA pidiendo más suggestions o algo así, quiero que eso no se haga, sino que esas suggestions se sitúan simplementes como ejemplos estáticos en el código, además relacionado con estas suggestions, quiero que cuando le das a use this prompt, quiero que en el cuadro de texto de capturar idea o de nueva idea se inyecte un prompt en el cual se le dice a la IA, la base de la idea, pero siempre es importante que ese prompt no sea muy grande y el usuario tenga rienda suelta para poner lo que quiera aunque se especifique algo en concreto.

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
