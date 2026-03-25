# TypeScript Best Practices

## Strict Mode Is Non-Negotiable

Always enable `strict: true` in `tsconfig.json`. This enables:
- `strictNullChecks` — catches null/undefined bugs at compile time
- `noImplicitAny` — prevents accidental `any` types
- `strictFunctionTypes` — catches parameter type mismatches

Without strict mode, TypeScript is just JavaScript with extra syntax.

## No `any` — Use `unknown` and Narrow

`any` disables TypeScript. Use `unknown` when the type is genuinely unknown, then narrow it:

```typescript
// BAD: disables type checking entirely
function processResponse(data: any) {
  return data.results.map((r: any) => r.title)
}

// GOOD: validate before using
function processResponse(data: unknown) {
  const parsed = responseSchema.parse(data)  // Zod throws if invalid
  return parsed.results.map(r => r.title)    // fully typed
}
```

## Type Aliases Over Interfaces for Data Shapes

Use `type` for data shapes (what things are). Use `interface` only when you need declaration merging (rare):

```typescript
// Prefer this
type Idea = {
  id:      string
  title:   string
  sector:  Sector
  status:  IdeaStatus
}

type CreateIdeaInput = Pick<Idea, 'title' | 'sector'> & {
  rawContent: string
}
```

## Enums → Union Types

TypeScript enums generate runtime code and have subtle footguns. Use string union types instead:

```typescript
// BAD
enum IdeaStatus {
  DRAFT     = 'DRAFT',
  REFINING  = 'REFINING',
  VALIDATED = 'VALIDATED',
}

// GOOD
type IdeaStatus = 'DRAFT' | 'REFINING' | 'VALIDATED' | 'PUBLISHED'

// Use a const object if you need to iterate over values
const IDEA_STATUSES = ['DRAFT', 'REFINING', 'VALIDATED', 'PUBLISHED'] as const
type IdeaStatus = typeof IDEA_STATUSES[number]
```

## Discriminated Unions for Result Types

Instead of throwing everywhere or returning `null`, use discriminated unions for operations that can fail in expected ways:

```typescript
type Result<T, E = string> =
  | { success: true;  data:  T }
  | { success: false; error: E }

async function extractIdea(content: string): Promise<Result<ExtractedIdea>> {
  try {
    const data = await callClaude(content)
    return { success: true, data }
  } catch {
    return { success: false, error: 'Claude extraction failed' }
  }
}

// Caller gets exhaustive type checking
const result = await extractIdea(content)
if (!result.success) {
  // result.error is typed here
  return res.status(500).json({ error: result.error })
}
// result.data is typed here
```

## Avoid Type Assertions (`as`)

`as` is a lie to the compiler. It doesn't convert anything at runtime:

```typescript
// BAD: will crash at runtime if data doesn't match
const idea = response.data as Idea

// GOOD: validate at runtime boundary
const idea = ideaSchema.parse(response.data)
```

The only valid use of `as` is narrowing within the same type family, or as `as const` for literal types.

## Utility Types — Use Them

Don't redeclare types that TypeScript can derive:

```typescript
type Idea = {
  id:       string
  title:    string
  sector:   string
  userId:   string
  password: string  // shouldn't be sent to client
}

// Derive from source of truth — don't copy-paste fields
type PublicIdea = Omit<Idea, 'password'>
type IdeaPreview = Pick<Idea, 'id' | 'title' | 'sector'>
type CreateIdeaInput = Omit<Idea, 'id'>
type UpdateIdeaInput = Partial<Pick<Idea, 'title' | 'sector'>>
```

## Type the Express Request

Extend Express's `Request` type to include `user` after auth middleware:

```typescript
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string }
    }
  }
}
```

Then in middleware:
```typescript
req.user = { userId: payload.userId }  // fully typed
```

## Zod as Runtime Type System

Zod schemas are the single source of truth for external data shapes. Derive TypeScript types from schemas — never define both separately:

```typescript
import { z } from 'zod'

export const createIdeaSchema = z.object({
  content:  z.string().min(1).max(10000).optional(),
  mediaUrl: z.string().url().optional(),
  sector:   z.enum(['tech', 'health', 'finance', 'education', 'travel', 'food', 'sports', 'entertainment', 'productivity', 'other']).optional(),
}).refine(d => d.content || d.mediaUrl, { message: 'content or mediaUrl required' })

// TypeScript type is derived automatically — zero duplication
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>
```

## Non-Null Assertion (`!`) — Avoid It

`!` is a promise to the compiler that something is not null. If you're wrong, you get a runtime crash with no useful error:

```typescript
// BAD: crashes if user is undefined
const id = req.user!.userId

// GOOD: explicit check with useful error
if (!req.user) throw new UnauthorizedError()
const id = req.user.userId
```

## Naming Conventions

- Types/interfaces: `PascalCase` — `IdeaService`, `ValidationReport`
- Functions/variables: `camelCase` — `createIdea`, `validationScore`
- Constants: `SCREAMING_SNAKE_CASE` for true constants — `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- Files: `camelCase` for modules — `ideaService.ts`, `validateBody.ts`
- React components: `PascalCase` — `IdeaCard.tsx`, `ValidationProgress.tsx`
