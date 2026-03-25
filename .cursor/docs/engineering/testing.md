# Testing Strategy

## What to Test and What Not To

Test behavior, not implementation. A test that breaks when you rename a variable is not useful. A test that breaks when you break real functionality is invaluable.

**Test these:**
- Service layer logic (business rules, edge cases, error paths)
- API route handlers (input validation, auth enforcement, response shape)
- Utility functions with non-trivial logic
- Validation schemas

**Skip these (or test minimally):**
- Prisma queries with no logic around them
- Simple CRUD routes with no business logic
- Third-party library internals
- UI component snapshots (brittle, low value)

## Test Structure

Use the Arrange → Act → Assert pattern consistently:

```typescript
describe('IdeaService.create', () => {
  it('returns extracted idea when content is valid', async () => {
    // Arrange
    const mockExtractor = { extract: vi.fn().mockResolvedValue(mockExtracted) }
    const mockRepo     = { create: vi.fn().mockResolvedValue(mockIdea) }
    const service      = new IdeaService(mockExtractor, mockRepo)

    // Act
    const result = await service.create('user-123', { rawContent: 'My idea text' })

    // Assert
    expect(result.title).toBe(mockIdea.title)
    expect(mockExtractor.extract).toHaveBeenCalledWith('My idea text')
  })

  it('throws NotFoundError when user does not exist', async () => {
    const mockRepo = { findUser: vi.fn().mockResolvedValue(null) }
    const service  = new IdeaService(mockExtractor, mockRepo)

    await expect(service.create('bad-id', {})).rejects.toThrow(NotFoundError)
  })
})
```

## Test File Location

Co-locate tests with source files:
```
src/
  services/
    ideaService.ts
    ideaService.test.ts   ← right next to the source
  routes/
    ideas.ts
    ideas.test.ts
```

## Backend: Route Handler Tests

Use `supertest` to test routes end-to-end in memory — no real server needed:

```typescript
import request from 'supertest'
import app from '../index'
import { prisma } from '../lib/prisma'

describe('POST /api/ideas/create', () => {
  beforeEach(async () => {
    await prisma.idea.deleteMany()
  })

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/ideas/create')
      .send({ content: 'My idea' })

    expect(res.status).toBe(401)
  })

  it('returns 422 when body is missing content and mediaUrl', async () => {
    const res = await request(app)
      .post('/api/ideas/create')
      .set('Cookie', `token=${validToken}`)
      .send({})

    expect(res.status).toBe(422)
    expect(res.body.code).toBe('VALIDATION_ERROR')
  })

  it('creates idea and returns 201 with extracted data', async () => {
    const res = await request(app)
      .post('/api/ideas/create')
      .set('Cookie', `token=${validToken}`)
      .send({ content: 'An app that helps people find ideas' })

    expect(res.status).toBe(201)
    expect(res.body.ideaId).toBeDefined()
    expect(res.body.extracted.title).toBeTruthy()
  })
})
```

## Mocking External Services

Never call real external APIs in tests. Mock at the module boundary:

```typescript
// Mock Claude API in tests
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockExtractedIdea) }]
      })
    }
  }))
}))

// Mock Prisma with a test database or in-memory mock
vi.mock('../lib/prisma', () => ({
  prisma: {
    idea: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    }
  }
}))
```

## Self-Validation Tests (LLM Output)

Since this app relies heavily on Claude API responses, add tests that validate the shape of AI output before trusting it:

```typescript
// services/ai/extractor.test.ts
describe('extractIdea output validation', () => {
  it('returns object matching ExtractedIdea schema', async () => {
    const result = await extractIdea('An app for tracking group travel plans')

    // Validate shape — don't test specific AI content
    expect(result).toMatchObject({
      title:           expect.any(String),
      problem:         expect.any(String),
      solution:        expect.any(String),
      target_audience: expect.any(String),
      sector:          expect.stringMatching(/^(tech|health|finance|education|travel|food|sports|entertainment|productivity|other)$/),
      confidence:      expect.any(Number),
      search_keywords: expect.arrayContaining([expect.any(String)]),
    })
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.search_keywords.length).toBeGreaterThanOrEqual(3)
  })

  it('returns confidence below 0.4 for vague input', async () => {
    const result = await extractIdea('something cool idk')
    expect(result.confidence).toBeLessThan(0.4)
  })
})
```

## Zod Schema Tests

Test your validation schemas with valid and invalid inputs:

```typescript
describe('createIdeaSchema', () => {
  it('accepts content only', () => {
    expect(createIdeaSchema.safeParse({ content: 'hello' }).success).toBe(true)
  })

  it('accepts mediaUrl only', () => {
    expect(createIdeaSchema.safeParse({ mediaUrl: 'https://example.com/file.mp3' }).success).toBe(true)
  })

  it('rejects empty body', () => {
    expect(createIdeaSchema.safeParse({}).success).toBe(false)
  })

  it('rejects invalid mediaUrl', () => {
    expect(createIdeaSchema.safeParse({ mediaUrl: 'not-a-url' }).success).toBe(false)
  })
})
```

## Frontend: What to Test

For frontend, focus on interaction logic — not rendering details:

```typescript
// Test: does the wizard advance on option selection?
it('advances to next step when option is selected and Continue is clicked', async () => {
  render(<RefinementWizard ideaId="123" onComplete={vi.fn()} />)

  await waitFor(() => screen.getByText(/who specifically pays/i))
  fireEvent.click(screen.getByText('Small businesses'))
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }))

  await waitFor(() => screen.getByText(/main competing solution/i))
})

// Test: does validation stream update UI?
it('shows searching state then done state per source', async () => {
  render(<ValidationProgress ideaId="123" />)
  expect(screen.getByText('Reddit')).toBeInTheDocument()
  // ... simulate SSE events
})
```

## Test Setup (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',           // 'jsdom' for frontend tests
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'src/test'],
    },
  },
})
```

```typescript
// src/test/setup.ts
import { vi } from 'vitest'
import { prisma } from '../lib/prisma'

afterEach(async () => {
  vi.clearAllMocks()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

## Coverage Goals

Don't chase 100% coverage — it creates tests that test nothing. Aim for:
- Services: 80%+ (this is where bugs live)
- Route handlers: cover auth, validation, and happy path
- Utilities: 100% (they're small and pure)
- UI components: cover interaction logic, skip render snapshots
