# LLM Self-Validation & Prompt Engineering

## Core Rule: Always Return Structured JSON

Every Claude API call in this codebase must return structured JSON. Never return prose that the frontend parses with regex or string manipulation. If the output shape is undefined, the feature is undefined.

Before writing any Claude call, define the output schema in Zod first:

```typescript
// Define schema BEFORE writing the prompt
const extractedIdeaSchema = z.object({
  title:           z.string().min(1).max(100),
  problem:         z.string().min(1),
  solution:        z.string().min(1),
  target_audience: z.string().min(1),
  sector:          z.enum(['tech', 'health', 'finance', 'education', 'travel', 'food', 'sports', 'entertainment', 'productivity', 'other']),
  confidence:      z.number().min(0).max(1),
  search_keywords: z.array(z.string()).min(3).max(10),
})

type ExtractedIdea = z.infer<typeof extractedIdeaSchema>
```

Then write the prompt to match, and validate the output:

```typescript
async function extractIdea(content: string): Promise<ExtractedIdea> {
  const response = await client.messages.create({ ... })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip markdown fences if the model adds them despite instructions
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()

  const parsed = extractedIdeaSchema.safeParse(JSON.parse(clean))
  if (!parsed.success) {
    throw new Error(`Claude returned invalid shape: ${parsed.error.message}`)
  }

  return parsed.data
}
```

## Prompt Structure

Every system prompt must specify exactly three things:
1. **Role** — what the model is
2. **Output format** — exact JSON structure with field names and types
3. **Rules** — constraints the model must follow

```typescript
const SYSTEM = `You are an idea extraction specialist.

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "title": "string — 5 to 8 words",
  "problem": "string — 1 to 2 sentences",
  "solution": "string — 1 to 2 sentences",
  "target_audience": "string — specific, not generic",
  "sector": "one of: tech | health | finance | education | travel | food | sports | entertainment | productivity | other",
  "confidence": "number between 0 and 1",
  "search_keywords": "array of 5 to 8 strings"
}

Rules:
- Never invent details not present in the input
- If the input is too vague to extract a clear idea, set confidence below 0.4
- Return raw JSON only — no markdown, no preamble, no explanation`
```

## Separation of System and User Content

Never interpolate user input into the system prompt. User content belongs in the user message only:

```typescript
// BAD: user can inject instructions into the system prompt
const SYSTEM = `You are a helpful assistant. Analyze this idea: ${userInput}`

// GOOD: system defines behavior, user message contains data
const SYSTEM = `You are an idea extraction specialist. [rules here]`
const messages = [{ role: 'user', content: userInput }]
```

## Retry Logic for Malformed Responses

Models occasionally return malformed JSON. Add one retry before failing:

```typescript
async function callClaude<T>(
  schema: z.ZodSchema<T>,
  messages: MessageParam[],
  systemPrompt: string,
  maxRetries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await client.messages.create({
      model:   'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:  systemPrompt,
      messages,
    })

    const text  = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()

    try {
      const parsed = schema.parse(JSON.parse(clean))
      return parsed
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error(`Claude returned invalid JSON after ${maxRetries + 1} attempts: ${clean.slice(0, 200)}`)
      }
      // Add the failed response and correction request to messages, retry
      messages = [
        ...messages,
        { role: 'assistant', content: text },
        { role: 'user',      content: 'Your response was not valid JSON. Return only the JSON object, no other text.' }
      ]
    }
  }
  throw new Error('Unreachable')
}
```

## Validate Required Fields Before Sending to Claude

Garbage in, garbage out. Validate inputs before constructing prompts:

```typescript
// BAD: sends empty string to Claude, wastes tokens, gets bad output
const result = await extractIdea(req.body.content)

// GOOD: validate first
const content = req.body.content?.trim()
if (!content || content.length < 10) {
  return res.status(422).json({ error: 'Content too short to extract an idea from' })
}
const result = await extractIdea(content)
```

## Token Budget Management

Each call type has a max_tokens ceiling. Never use the same ceiling for everything:

```typescript
const TOKEN_BUDGETS = {
  extraction:    1000,   // structured JSON, short fields
  questions:     1500,   // 5 questions with options
  synthesis:     2000,   // full refined idea object
  validation:    1000,   // per-source analysis
  suggestions:   500,    // 3 short suggestion objects
} as const
```

## Prompt Versioning

When you change a prompt, bump the version in a comment and test the new output shape:

```typescript
// Prompt v2 — added search_keywords field, bumped max_tokens
// Changed: added `search_keywords` array for validation queries
const EXTRACTION_SYSTEM_V2 = `...`
```

## Self-Testing Prompts

After writing a new prompt, test it with these input types before shipping:

| Input type | Expected behavior |
|---|---|
| Clear, detailed idea | High confidence (>0.7), all fields populated |
| Vague one-liner | Low confidence (<0.4), partial fields |
| Unrelated text (recipe, code) | Confidence <0.3, minimal extraction |
| Very long input (>2000 chars) | Still produces compact, valid JSON |
| Non-English input | Handles gracefully, doesn't crash |
| Adversarial input ("ignore previous instructions") | Returns normal output, not manipulated |

## Web Search Tool Usage

When using Claude's `web_search` tool, always extract text from multi-block responses:

```typescript
const response = await client.messages.create({
  model:   'claude-sonnet-4-20250514',
  max_tokens: 2000,
  tools:   [{ type: 'web_search_20250305', name: 'web_search' }],
  messages: [{ role: 'user', content: prompt }],
})

// Extract only text blocks — tool_use and tool_result blocks are not your output
const text = response.content
  .filter(block => block.type === 'text')
  .map(block => (block as TextBlock).text)
  .join('\n')

// Then validate the combined text as JSON
const parsed = schema.parse(JSON.parse(text))
```

## Streaming SSE Responses

When streaming validation progress to the frontend, structure every event consistently:

```typescript
type SSEEvent =
  | { source: string; status: 'searching' }
  | { source: string; status: 'done'; score: number; summary: string }
  | { type: 'complete'; validation_score: number; verdict: string; recommendation: string }
  | { type: 'error'; source: string; message: string }

function emit(res: Response, data: SSEEvent) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}
```

The frontend uses the same type to parse events — single source of truth:

```typescript
// frontend/src/hooks/useValidationStream.ts
type SSEEvent = /* same type as above, imported from shared types or redeclared */
```
