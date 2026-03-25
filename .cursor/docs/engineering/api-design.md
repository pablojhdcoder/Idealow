# API Design Conventions

## URL Structure

Resources are nouns, never verbs. Actions are expressed through HTTP methods:

```
POST   /api/ideas              → create idea
GET    /api/ideas              → list user's ideas
GET    /api/ideas/:id          → get single idea
PATCH  /api/ideas/:id          → update idea (partial)
DELETE /api/ideas/:id          → delete idea

POST   /api/ideas/:id/validate        → trigger validation job
GET    /api/ideas/:id/validate/stream → SSE stream of validation progress

POST   /api/ideas/:id/feedback        → vote + comment
GET    /api/ideas/:id/feedback        → list feedback

GET    /api/feed               → public community feed
GET    /api/users/me           → current user profile
PATCH  /api/users/profile      → update profile
GET    /api/users/suggestions  → personalized idea prompts
```

Never: `POST /api/validateIdea` or `GET /api/getIdeas`.

## HTTP Status Codes — Use Them Correctly

```
200 OK              → successful GET, PATCH
201 Created         → successful POST that creates a resource
204 No Content      → successful DELETE
400 Bad Request     → malformed request (syntax error, wrong content-type)
401 Unauthorized    → not logged in
403 Forbidden       → logged in but not allowed (wrong ownership)
404 Not Found       → resource doesn't exist
409 Conflict        → duplicate (email already taken)
422 Unprocessable   → valid syntax but failed validation (Zod errors)
429 Too Many Requests → rate limited
500 Internal Server Error → unexpected server error
```

## Consistent Response Shape

Every endpoint returns the same envelope:

```typescript
// Success
{
  "idea": { ... }         // single resource
  "ideas": [ ... ]        // collection
  "pagination": { ... }   // always present on collections
}

// Error
{
  "error": "Human-readable message",
  "code":  "MACHINE_READABLE_CODE",
  "details": { ... }     // optional, Zod errors etc.
}
```

Never return different shapes for the same endpoint. Never return an array at the top level — always wrap in an object so you can add metadata later.

## Pagination Shape

```typescript
type PaginatedResponse<T> = {
  data:       T[]
  pagination: {
    page:  number
    limit: number
    total: number
    pages: number
  }
}
```

## Input Validation Response

When Zod validation fails, return structured errors the frontend can map to form fields:

```typescript
// middleware/validate.ts
if (!result.success) {
  return res.status(422).json({
    error:   'Validation failed',
    code:    'VALIDATION_ERROR',
    details: result.error.flatten().fieldErrors,
    // fieldErrors shape: { fieldName: ["error message"] }
  })
}
```

## PATCH vs PUT

Use `PATCH` for partial updates (send only the fields you want to change). Never use `PUT` unless you're replacing the entire resource:

```typescript
// PATCH — only update what's sent
router.patch('/ideas/:id', requireAuth, asyncHandler(async (req, res) => {
  const { title, sector, isPublished } = req.body  // only update present fields
  const updated = await prisma.idea.update({
    where: { id: req.params.id, userId: req.user!.userId },
    data:  { ...(title && { title }), ...(sector && { sector }), ...(isPublished !== undefined && { isPublished }) }
  })
  res.json({ idea: updated })
}))
```

## Authorization Pattern

Every route that touches a resource must verify ownership — not just authentication:

```typescript
// BAD: checks login but not ownership
router.delete('/ideas/:id', requireAuth, async (req, res) => {
  await prisma.idea.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// GOOD: checks both login and ownership
router.delete('/ideas/:id', requireAuth, asyncHandler(async (req, res) => {
  const deleted = await prisma.idea.deleteMany({
    where: {
      id:     req.params.id,
      userId: req.user!.userId,  // ownership check in the query
    }
  })

  if (deleted.count === 0) {
    throw new NotFoundError('Idea')  // 404 whether it doesn't exist or isn't owned
  }

  res.status(204).send()
}))
```

Returning 404 (not 403) for unauthorized resources is intentional — it doesn't reveal whether a resource exists.

## Query Parameters

Validate query params with Zod just like body params:

```typescript
const feedQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(50).default(20),
  sector: z.enum(['tech', 'health', 'finance', ...]).optional(),
  sort:   z.enum(['newest', 'score', 'votes']).default('newest'),
})

router.get('/feed', asyncHandler(async (req, res) => {
  const query = feedQuerySchema.parse(req.query)  // throws 400 if invalid
  // query.page, query.limit, etc. are now typed
}))
```

## Idempotency for Critical Operations

Operations that should not be repeated (triggering validation, creating a resource) should be idempotent or check for existing state:

```typescript
router.post('/ideas/:id/validate', requireAuth, asyncHandler(async (req, res) => {
  const idea = await prisma.idea.findUnique({
    where: { id: req.params.id, userId: req.user!.userId }
  })

  if (!idea) throw new NotFoundError('Idea')

  // Don't re-validate if already in progress
  if (idea.status === 'REFINING') {
    return res.status(409).json({
      error: 'Validation already in progress',
      code:  'VALIDATION_IN_PROGRESS'
    })
  }

  void runValidation(idea.id).catch(err => logger.error({ ideaId: idea.id, err }, 'runValidation failed'))
  res.json({ status: 'started' })
}))
```
