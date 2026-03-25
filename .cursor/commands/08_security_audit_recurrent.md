# Command: Security Audit (Vibe Security)

## Task
Ejecutar auditoria de seguridad enfocada en vulnerabilidades explotables.

## Prompt
```text
Haz una auditoria de seguridad del codigo con enfoque ofensivo (que puede explotar un atacante).

Usa como marco:
- `.cursor/skills/vibe-security/SKILL.md`
- Referencias relevantes en `.cursor/skills/vibe-security/references/`

Checklist minimo:
1) Secrets/env vars expuestos
2) AuthN/AuthZ (JWT, middleware, control por recurso)
3) Validacion de input y acceso a datos (inyecciones, bypass)
4) Rate limiting en endpoints sensibles y llamadas AI
5) Integracion LLM (keys, limites de uso, prompt injection, salida insegura)
6) Configuracion de despliegue y headers de seguridad

Formato obligatorio:
- Critical -> High -> Medium -> Low
- Cada hallazgo con: archivo, vulnerabilidad, impacto atacante, fix before/after
- Cerrar con plan priorizado de remediacion

Importante:
- Reporta solo riesgos reales, no nitpicks.
- Si detectas algo critico, ponlo arriba del todo.
```

## Trigger corto
```text
Revisa seguridad de esta feature antes de merge.
```
