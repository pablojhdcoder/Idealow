# Command: Idea Flashcard + Community Feed

## Task
Build the flashcard component (private + published views) and the community feed where users can vote and comment on published ideas.

---

## Flashcard Component

### Data structure displayed
```ts
type IdeaFlashcard = {
  id: string
  refined_title: string
  elevator_pitch: string
  sector: string
  validation_score: number
  verdict: "STRONG_SIGNAL" | "MODERATE_SIGNAL" | "WEAK_SIGNAL" | "NO_SIGNAL"
  problem_statement: string
  solution: string
  target_customer: string
  monetization: string
  mvp_feature: string
  why_now: string
  biggest_risk: string
  competitors: Competitor[]
  validation_breakdown: ValidationBreakdown
  is_published: boolean
  published_at: string | null
  author: { username: string; avatar_url: string }
  community_votes: { useful: number; interesting: number; not_useful: number }
  created_at: string
}
```

### Card States

**Collapsed (grid view)**
- Size: ~320x200px card
- Front face shows:
  - Sector tag pill (top left, colored by sector)
  - Score badge (top right, color-coded)
  - Title in `Instrument Serif`, 20px
  - Elevator pitch in muted text, 2 lines max
  - Author avatar + name (if published)
  - "Tap to expand" subtle hint at bottom
- Hover: slight lift (translateY -4px), shadow deepens

**Expanded (modal/sheet)**
- Opens with spring animation (scale 0.95 → 1, opacity 0 → 1)
- Scrollable content inside rounded-3xl sheet
- Sections with subtle dividers:
  1. **Header**: title, score ring, verdict badge
  2. **The Idea**: problem → solution → target customer
  3. **Business angle**: monetization + MVP feature + distribution
  4. **Why now + biggest risk**: two-column layout
  5. **Validation breakdown**: source-by-source scores with icons
  6. **Competitors**: horizontal scroll of competitor cards
  7. **Community** (if published): vote buttons + comments

### Score Badge Colors
```ts
const scoreConfig = {
  STRONG_SIGNAL:   { bg: "#DCFCE7", text: "#166534", label: "Strong signal" },
  MODERATE_SIGNAL: { bg: "#FEF9C3", text: "#854D0E", label: "Moderate signal" },
  WEAK_SIGNAL:     { bg: "#FEE2E2", text: "#991B1B", label: "Weak signal" },
  NO_SIGNAL:       { bg: "#F3F4F6", text: "#374151", label: "No signal" },
}
```

### Publish Toggle
- Bottom of expanded card
- Toggle switch with label: "Share with community"
- When turning ON: confirmation dialog
  - "Your idea will be visible to all Idealow users"
  - "Others can vote and comment on it"
  - Confirm / Cancel buttons
- Publish calls `PATCH /api/ideas/{id}` with `{ is_published: true }`

---

## Community Feed

### Layout
- 3-column masonry grid (desktop) / 2-col (tablet) / 1-col (mobile)
- Filter bar: All · Strong Signal · By Sector · Most Voted · New
- Search input with instant filtering

### Feed Card (compact)
- Same collapsed flashcard + community vote counts at bottom
- Vote buttons: 👍 Useful · 💡 Interesting · 👎 Not useful
- Click to vote (requires auth, one vote per user per idea)
- Optimistic UI: update count instantly, revert if API fails

### Community Feedback Section (inside expanded card)

```
POST /api/ideas/{idea_id}/feedback
Body: { vote: "USEFUL" | "INTERESTING" | "NOT_USEFUL", comment?: string }
```

Display:
- Vote breakdown bar (proportional, 3 colors)
- Comment list (newest first, paginated)
- Comment input (max 280 chars, optional when voting)
- Each comment: avatar + username + comment + timestamp

---

## Backend: Publish + Feedback Routes

```python
# PATCH /api/ideas/{idea_id} — publish/unpublish
# POST  /api/ideas/{idea_id}/feedback — vote + optional comment
# GET   /api/feed — paginated public ideas feed
# GET   /api/feed?sector=tech&sort=score — filtered feed
```

Feed query with score, votes and author in one JOIN — avoid N+1.

---

## Frontend Files to Create
- `frontend/components/ideas/IdeaCard.tsx` — collapsed card
- `frontend/components/ideas/IdeaSheet.tsx` — expanded modal/sheet
- `frontend/components/ideas/ValidationBreakdown.tsx` — source scores
- `frontend/components/ideas/CompetitorCard.tsx` — competitor display
- `frontend/components/ideas/VoteButtons.tsx` — community voting
- `frontend/components/ideas/CommentList.tsx` — comments
- `frontend/app/feed/page.tsx` — community feed page
- `frontend/app/ideas/page.tsx` — user's private ideas grid
- `frontend/app/ideas/[id]/page.tsx` — single idea page (SEO)

---

## Animation Details

```tsx
// Card hover lift
<motion.div
  whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>

// Sheet open
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 20 }}
  transition={{ type: "spring", stiffness: 350, damping: 30 }}
>

// Vote count update
<motion.span
  key={voteCount} // re-triggers on change
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
```

---

## Sector Colors (for pills and tags)
```ts
const sectorColors = {
  tech:         { bg: "#EEF2FF", text: "#4338CA" },
  health:       { bg: "#F0FDF4", text: "#166534" },
  finance:      { bg: "#FFFBEB", text: "#92400E" },
  education:    { bg: "#F0F9FF", text: "#075985" },
  travel:       { bg: "#FDF4FF", text: "#7E22CE" },
  food:         { bg: "#FFF7ED", text: "#C2410C" },
  sports:       { bg: "#F0FDF4", text: "#065F46" },
  entertainment:{ bg: "#FFF1F2", text: "#9F1239" },
  productivity: { bg: "#F8FAFC", text: "#334155" },
  other:        { bg: "#F9FAFB", text: "#374151" },
}
```
