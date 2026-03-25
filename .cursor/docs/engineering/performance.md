# Performance & Optimization

## Backend: Database Queries

### Avoid N+1 Queries

The most common performance bug in apps using an ORM. If you're querying inside a loop, you have an N+1:

```typescript
// BAD: 1 query for ideas + N queries for users (one per idea)
const ideas = await prisma.idea.findMany()
for (const idea of ideas) {
  const user = await prisma.user.findUnique({ where: { id: idea.userId } })
  // ...
}

// GOOD: 1 query with JOIN
const ideas = await prisma.idea.findMany({
  include: { user: { select: { username: true, avatarUrl: true } } }
})
```

### Select Only What You Need

Never `SELECT *` in production queries. Fetching unused columns wastes bandwidth and memory:

```typescript
// BAD: fetches all columns including large JSON fields
const ideas = await prisma.idea.findMany()

// GOOD: only what the feed card needs
const ideas = await prisma.idea.findMany({
  select: {
    id:              true,
    title:           true,
    summary:         true,
    sector:          true,
    validationScore: true,
    isPublished:     true,
    createdAt:       true,
    user: {
      select: { username: true, avatarUrl: true }
    },
    _count: { select: { feedback: true } }
  }
})
```

### Paginate Everything

Never return unbounded lists. Every list endpoint must accept `page` and `limit`:

```typescript
router.get('/feed', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
  const skip  = (page - 1) * limit

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where: { isPublished: true },
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.idea.count({ where: { isPublished: true } }),
  ])

  res.json({
    ideas,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  })
})
```

### Index the Columns You Filter and Sort On

For every `WHERE` and `ORDER BY` in a frequent query, there should be an index:

```prisma
model Idea {
  id          String   @id @default(uuid())
  userId      String
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([userId])              // filter by user's ideas
  @@index([isPublished, createdAt]) // feed query: published + sort by date
}
```

## Backend: Async and Parallelism

Run independent async operations in parallel — never sequentially:

```typescript
// BAD: sequential — total time = time(A) + time(B) + time(C)
const reddit      = await validateReddit(idea)
const trends      = await validateTrends(idea)
const competitors = await validateCompetitors(idea)

// GOOD: parallel — total time = max(time(A), time(B), time(C))
const [reddit, trends, competitors] = await Promise.allSettled([
  validateReddit(idea),
  validateTrends(idea),
  validateCompetitors(idea),
])
```

Use `Promise.allSettled` instead of `Promise.all` when partial failures are acceptable (one failing source shouldn't abort the whole validation).

## Frontend: React Performance

### Memoize Expensive Computations

```typescript
// BAD: recalculates on every render
function IdeaFeed({ ideas }: { ideas: Idea[] }) {
  const sorted = ideas.sort((a, b) => b.validationScore - a.validationScore)
  // ...
}

// GOOD: only recalculates when ideas changes
function IdeaFeed({ ideas }: { ideas: Idea[] }) {
  const sorted = useMemo(
    () => [...ideas].sort((a, b) => b.validationScore - a.validationScore),
    [ideas]
  )
  // ...
}
```

### Code Split by Route

Every page should be lazy-loaded. This is critical for mobile performance:

```typescript
// src/app/Router.tsx
import { lazy, Suspense } from 'react'

const Dashboard   = lazy(() => import('../pages/dashboard/Dashboard'))
const IdeasPage   = lazy(() => import('../pages/ideas/IdeasPage'))
const FeedPage    = lazy(() => import('../pages/feed/FeedPage'))

export function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ideas"     element={<IdeasPage />} />
        <Route path="/feed"      element={<FeedPage />} />
      </Routes>
    </Suspense>
  )
}
```

### Debounce Search Inputs

Never fire a request on every keystroke:

```typescript
import { useDebouncedCallback } from 'use-debounce'

function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const debouncedSearch = useDebouncedCallback(onSearch, 300)

  return (
    <input
      onChange={e => debouncedSearch(e.target.value)}
      placeholder="Search ideas..."
    />
  )
}
```

### Avoid Layout Shifts

Always provide explicit dimensions for images and skeleton loaders that match the real content size. Layout shifts (CLS) make the app feel broken on mobile:

```tsx
// Skeleton that matches real card dimensions
function IdeaCardSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-100 animate-pulse h-48 w-full" />
  )
}
```

## Framer Motion on Mobile

Heavy animations degrade performance on mid-range Android devices. Rules:
- Only animate `transform` and `opacity` — these are GPU-accelerated
- Never animate `width`, `height`, `top`, `left` — these trigger layout recalculation
- Keep `duration` under 300ms for interactive elements
- Use `layoutId` for shared element transitions, not manual coordinate calculations

```typescript
// GOOD: GPU-accelerated properties only
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
>

// BAD: triggers layout recalculation on every frame
<motion.div
  initial={{ height: 0 }}
  animate={{ height: 200 }}
>
```

## API Response Caching

Use TanStack Query's built-in caching. Configure stale times appropriately:

```typescript
// User profile — rarely changes, cache for 10 minutes
const { data: user } = useQuery({
  queryKey: ['user', 'me'],
  queryFn:  fetchCurrentUser,
  staleTime: 10 * 60 * 1000,
})

// Feed — changes frequently, cache for 1 minute
const { data: feed } = useQuery({
  queryKey: ['feed', { sector, sort }],
  queryFn:  () => fetchFeed({ sector, sort }),
  staleTime: 60 * 1000,
})

// Validation stream — never cache (real-time SSE)
// Don't use useQuery for SSE — use useValidationStream hook instead
```
