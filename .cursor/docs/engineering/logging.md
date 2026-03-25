# Logging & Observability

## Core Rule: No console.log in Production Code

`console.log` is for debugging during development. It has no log levels, no structure, and can't be filtered, aggregated, or alarmed on. Use a structured logger everywhere:

```typescript
// lib/logger.ts
import pino from 'pino'
import { config } from '../config'

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
})
```

## What to Log

**Log these:**
- Incoming requests (method, path, status, duration) — handled by middleware
- Service-level errors with context (userId, ideaId, what was attempted)
- External API calls — which service, duration, success/failure
- Background job starts and completions with outcome
- Auth events — login, logout, failed attempts

**Never log these:**
- Passwords or password hashes
- Full JWT tokens
- Credit card numbers or payment details
- Complete request bodies (may contain sensitive user data)
- API keys or secrets

## Request Logging Middleware

```typescript
// middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on('finish', () => {
    logger.info({
      method:   req.method,
      path:     req.path,
      status:   res.statusCode,
      duration: `${Date.now() - start}ms`,
      userId:   req.user?.userId,
    }, 'request completed')
  })

  next()
}
```

## Service-Level Logging

Log at the service boundary — not inside every helper function:

```typescript
// services/ai/extractor.ts
export async function extractIdea(content: string, userId: string): Promise<ExtractedIdea> {
  logger.info({ userId, contentLength: content.length }, 'starting idea extraction')

  try {
    const result = await callClaude(content)
    logger.info({ userId, confidence: result.confidence }, 'idea extraction complete')
    return result
  } catch (err) {
    logger.error({ userId, err }, 'idea extraction failed')
    throw err
  }
}
```

## Error Logging

Log errors with full context. The error message alone is rarely enough to debug in production:

```typescript
// middleware/errors.ts
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    // Expected errors — log at warn level with context
    logger.warn({
      code:   err.code,
      path:   req.path,
      userId: req.user?.userId,
    }, err.message)
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }

  // Unexpected errors — log at error level with full stack
  logger.error({
    err,
    path:    req.path,
    method:  req.method,
    userId:  req.user?.userId,
    body:    '[redacted]',  // never log full body
  }, 'Unhandled error')

  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' })
}
```

## Background / long-running work

Si en el futuro añades trabajos async (validación, embeddings), registra inicio, fin y error con `ideaId` (u otro id de correlación) y duración. Este repo no usa cola de mensajes externa: usa el mismo patrón de logging que el resto de servicios.

## External API Call Logging

Log every external API call with duration — this is how you find slow third-party dependencies:

```typescript
async function callRedditAPI(query: string) {
  const start = Date.now()
  try {
    const result = await axios.get(`https://www.reddit.com/search.json`, {
      params:  { q: query, limit: 25 },
      timeout: 8000,
    })
    logger.info({ query, duration: Date.now() - start, posts: result.data.data.children.length }, 'reddit search complete')
    return result.data
  } catch (err) {
    logger.error({ query, duration: Date.now() - start, err }, 'reddit search failed')
    throw err
  }
}
```

## Log Levels

Use the right level consistently:

| Level | When to use |
|---|---|
| `error` | Unexpected failure that requires investigation |
| `warn`  | Expected failure, recoverable (validation error, 404, rate limit hit) |
| `info`  | Normal significant events (request completed, job finished, user logged in) |
| `debug` | Detailed diagnostic info, only in development |

## Health Check Endpoint

Always expose a `/health` endpoint that returns service status. Monitoring tools ping this:

```typescript
app.get('/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`  // verify DB connection
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    logger.error({ err }, 'health check failed')
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() })
  }
})
```
