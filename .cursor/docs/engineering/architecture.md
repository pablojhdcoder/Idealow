# Architecture & Code Design

## Core Principle

Thin routes, fat services. Route handlers orchestrate — they do not contain business logic. Business logic lives in services. Services are pure functions or classes with no framework coupling.

## Layered Structure

Every backend feature follows this hierarchy:

```
Route Handler   →  validates input, calls service, returns response
Service         →  business logic, orchestrates DB + external calls
Repository      →  database queries only, no business logic
External Client →  third-party API wrappers only
```

**Route handler example (correct):**
```typescript
router.post('/ideas', requireAuth, validateBody(createIdeaSchema), async (req, res) => {
  const idea = await ideaService.create(req.user!.userId, req.body)
  res.status(201).json(idea)
})
```

**Route handler example (wrong — business logic leaking in):**
```typescript
router.post('/ideas', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.body.userId } })
  if (!user.sectors.includes(req.body.sector)) {
    return res.status(400).json({ error: 'Sector not in profile' })
  }
  const extracted = await anthropic.messages.create({ ... })
  const idea = await prisma.idea.create({ data: { ...extracted, userId: req.body.userId } })
  res.json(idea)
})
```

## Service Layer Rules

- Services never import from `express` or any HTTP framework
- Services receive plain data (strings, numbers, objects) — never `Request` or `Response`
- Services throw typed errors — routes catch and convert to HTTP responses
- One service per domain: `ideaService`, `userService`, `validationService`

```typescript
// services/ideaService.ts
export class IdeaService {
  async create(userId: string, input: CreateIdeaInput): Promise<Idea> {
    const extracted = await this.extractor.extract(input.rawContent)
    return this.repository.create({ userId, ...extracted })
  }
}
```

## Error Handling

Define typed application errors. Never throw raw strings or generic `Error`:

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED')
  }
}
```

Global error handler catches and converts:
```typescript
// middleware/errors.ts
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' })
}
```

## Async Handler Wrapper

Never repeat try/catch in every route. Use a wrapper:

```typescript
// lib/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express'

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Usage
router.post('/ideas', requireAuth, asyncHandler(async (req, res) => {
  const idea = await ideaService.create(req.user!.userId, req.body)
  res.json(idea)
}))
```

## Dependency Injection

Avoid `import`ing singletons directly inside services. Pass dependencies as constructor arguments — this makes services testable:

```typescript
// BAD: tightly coupled to global singleton
import { prisma } from '../lib/prisma'
export class IdeaService {
  async create(userId: string, input: unknown) {
    return prisma.idea.create({ ... })
  }
}

// GOOD: injectable dependency
export class IdeaService {
  constructor(private db: PrismaClient) {}
  async create(userId: string, input: unknown) {
    return this.db.idea.create({ ... })
  }
}
const ideaService = new IdeaService(prisma)
```

## Module Boundaries

Each domain module exports only what other modules need. Internal helpers stay unexported:

```typescript
// services/validation/index.ts  — public interface
export { ValidationService } from './ValidationService'
export type { ValidationReport, ValidationScore } from './types'

// services/validation/redditClient.ts — internal, not exported from index
```

## Frontend: Component Responsibilities

- **Pages** — fetch data, compose layout, handle navigation. No business logic.
- **Feature components** — UI for a specific domain (IdeaCard, ValidationProgress). Accept data as props.
- **UI components** — Pure presentational, zero business logic, fully reusable (Button, Badge, Input).
- **Hooks** — encapsulate state + side effects. A hook should do one thing.

```typescript
// BAD: page doing too much
export default function IdeasPage() {
  const [ideas, setIdeas] = useState([])
  useEffect(() => {
    fetch('/api/ideas').then(r => r.json()).then(data => {
      const sorted = data.sort((a, b) => b.score - a.score)
      const filtered = sorted.filter(i => i.status === 'VALIDATED')
      setIdeas(filtered)
    })
  }, [])
  // ...
}

// GOOD: logic in hook, page just composes
export default function IdeasPage() {
  const { ideas, isLoading } = useValidatedIdeas()
  return <IdeaGrid ideas={ideas} loading={isLoading} />
}
```

## Don't Repeat Yourself (DRY) — Practical Rules

Apply DRY when the same logic appears 3+ times, not 2. Premature abstraction is worse than duplication. Before abstracting, ask: are these things the same because they do the same thing, or just because they look similar now?

## YAGNI — Don't Build What You Don't Need

No generic plugin systems, no config-driven architecture, no over-engineered base classes. Build exactly what the current feature needs. Refactor when the second real use case appears.
