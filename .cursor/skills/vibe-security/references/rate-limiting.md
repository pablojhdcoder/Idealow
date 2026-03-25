# Rate Limiting & Abuse Prevention

## Where Rate Limiting Is Required

Every one of these endpoints needs rate limiting. AI assistants almost never add it:

- **Auth endpoints** — login, register, password reset, OTP verification, magic link. Without limits, attackers can brute-force passwords or enumerate accounts.
- **AI API calls** — Any endpoint that calls OpenAI, Anthropic, or similar. A single user can drain your entire monthly budget in minutes.
- **Email / SMS sending** — Attackers can use your app as a spam relay.
- **File processing** — Upload, resize, convert. CPU-intensive operations without limits enable denial-of-service.
- **Webhook-like endpoints** — Anything accepting external input at scale.

## Don't Store Rate Limits in Public Tables

If rate limit counters live in a Supabase public table, users can reset their own counters via the REST API. Use:

- **Almacén compartido / KV** — Contadores fuera del alcance del cliente (servicios de rate limit o KV gestionado)
- **Private schema table** — Not exposed via PostgREST
- **Middleware-level limiting** — At the edge or API gateway
- **In-memory stores** — For single-server deployments (shared store when scaling horizontally)

## Combine Per-IP and Per-User Limiting

- IP-only limits are defeated by rotating IPs (trivial with VPNs or botnets)
- User-only limits are defeated by creating new accounts
- Use both together for effective protection

## Billing Protection

- Set billing alerts on every cloud provider (AWS, GCP, Vercel, etc.)
- Set **hard spending caps** on AI API providers (OpenAI, Anthropic)
- Use per-user usage quotas with hard limits, not just soft warnings
- Monitor for anomalous usage patterns (sudden spikes, requests at odd hours)

## Implementation Pattern

```typescript
// Ejemplo típico (una instancia de API): límite en memoria del proceso (p. ej. express-rate-limit)
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

// app.use('/api/', apiLimiter)
```

En varias réplicas necesitas un store compartido compatible con tu middleware (no guardes contadores en tablas públicas expuestas al cliente).
