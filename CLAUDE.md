# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Read this file fully before writing any code. Every section is a constraint, not a suggestion.

## Project Overview

Personal Finance Dashboard — a monorepo with a React 19 frontend and Express backend.
Primary learning objective: explore Claude Code and the Anthropic API end-to-end.

```
finance-dashboard/
├── client/    # React 19 + Vite + TypeScript + Tailwind CSS v4
├── server/    # Express + TypeScript + @libsql/client (SQLite)
├── e2e/       # Playwright browser automation
└── Dockerfile # Multi-stage build; serves client from Express in production
```

All commands must be run from within the respective subdirectory (`client/` or `server/`).

---

## Commands

### Server (`cd server`)
```bash
npm run dev       # Start with tsx watch (hot reload) on port 3001
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output
npm test          # Run Vitest + Supertest integration tests once
```

### Client (`cd client`)
```bash
npm run dev       # Start Vite dev server on port 5173
npm run build     # Type-check (tsc --noEmit) then Vite production build
npm run lint      # ESLint
npm run preview   # Serve production build locally
```

### E2E (`cd e2e`)
```bash
npx playwright test            # Run all Playwright tests (needs both servers running)
npx playwright test --ui       # Interactive mode
```

### Run a single test
```bash
cd server && npx vitest run src/routes/transactions.test.ts
```

---

## Architecture

### Request flow
```
Browser → Vite dev proxy (/api/* → :3001) → Express → SQLite   ← dev
Browser → Express (:3001, STATIC_PATH set) → SQLite             ← production
```

### API client layer
Every resource has one file in `client/src/api/<resource>.ts`. The pattern is:
```typescript
export const transactionsApi = {
  list: (month?: string) => apiClient.get<Transaction[]>(...),
  create: (data: TransactionPayload) => apiClient.post<Transaction>(...),
  update: (id: number, data: TransactionPayload) => apiClient.put<Transaction>(...),
  remove: (id: number) => apiClient.delete(...),
}
```
- Always typed with generics. Never use `any` in API files.
- No error handling inside API files — errors bubble to the caller (the page).
- New API features always get a new file, e.g. `client/src/api/insights.ts`.

### State architecture
- **Global state (AppContext)**: `categories` (needed on every page) and `selectedMonth`.
  Nothing else belongs in context unless it is genuinely cross-page.
- **Page-local state**: all data-fetching state lives in pages, not components.
  Pattern: `useCallback` for the loader, `useEffect` to trigger it on mount/dep change.
- **Parallel fetches**: use `Promise.all` when loading multiple independent resources.
- No Redux, Zustand, Jotai, or any other state library. React Context is the ceiling.

### Database
- `@libsql/client` — all DB calls are `async`. There is no synchronous API.
- Client initialised once in `server/src/db.ts`, imported everywhere else.
- Parameterised queries only: `{ sql: '...WHERE id = ?', args: [id] }`. Never string-interpolate user input into SQL.
- Table wipe order in tests: `budgets → transactions → categories` (foreign key order).

### Module systems
- **Server**: CommonJS. Source uses `import/export`; tsc outputs CJS.
- **Client**: ESM, bundled by Vite.

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` plugin.
- Single entry: `client/src/index.css` containing only `@import "tailwindcss";`.
- Never add `tailwind.config.ts`, `postcss.config.*`, or inline `style={{}}` props.
- Shared class strings within a file: assign to a `const`, e.g. `const inputCls = '...'`.

### Validation
- All API request bodies validated with Zod, defined alongside the route handler.
- Never skip Zod on incoming data. Never trust `req.body` directly.
- Route param IDs validated with `parseId()` (returns `null` for non-positive integers → 400).

---

## Coding Conventions

### Exports
Named exports only. No default exports anywhere in this project.
```typescript
// ✅ correct
export function Dashboard() { ... }
export const transactionsApi = { ... }

// ❌ wrong
export default function Dashboard() { ... }
```

### Naming
| Thing | Convention | Example |
|---|---|---|
| Component / Page | `PascalCase`, filename matches | `Dashboard.tsx` |
| API module | `camelCase` object, `<resource>Api` suffix | `transactionsApi` |
| Utility function | `camelCase` | `exportPdf.ts` |
| Types / Interfaces | `PascalCase` | `Transaction`, `MonthlySummary` |
| Zod schemas | `PascalCase` + `Schema` suffix | `TransactionSchema` |

### TypeScript
- Prefer `interface` over `type` for component props and API shapes.
- Avoid `any`. If unavoidable, add a one-line comment explaining why.
- Keep the `Props` interface immediately above the component function.

### Component contract
Components receive data and callbacks as props. They do not fetch data themselves.

```typescript
interface Props {
  categories: Category[]
  initial?: Transaction | null   // present → edit mode, absent → create mode
  onSubmit: (data: TransactionPayload) => Promise<void>
  onCancel: () => void
}
```

- `onSubmit` is always `Promise<void>` — the component manages its own loading/error state around the await.
- `onCancel` is always sync `() => void`.
- Pages own all fetch logic and pass results down as props.

### Error handling
- Pages catch API errors into `const [error, setError] = useState<string | null>(null)`.
- Display inline near the relevant UI element, not in a global toast.
- Server `errorHandler.ts` returns `{ error: 'Internal server error' }` for 500s — never leaks internal messages.

---

## Test Patterns

### Server (Vitest + Supertest)
```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { db, initDb } from '../db'

beforeAll(async () => { await initDb() })

beforeEach(async () => {
  await db.execute('DELETE FROM budgets')
  await db.execute('DELETE FROM transactions')
  await db.execute('DELETE FROM categories')
})

async function seedCategory(name = 'Food', color = '#ff0000') {
  const res = await request(app).post('/api/categories').send({ name, color })
  return res.body as { id: number; name: string; color: string }
}
```
- One `describe` block per endpoint, one `it` per behaviour.
- Test observable HTTP behaviour (status codes, response shape) — not internal implementation.
- Seed helpers are local functions, never shared across test files.

### E2E (Playwright)
- Tests live in `e2e/tests/`.
- Use `getByRole` and `getByLabel` selectors — not CSS selectors.
- Re-seed mutable shared data in `beforeEach` via the live API.
- Use `Date.now()` in descriptions to avoid cross-run collisions.
- Do not modify `executablePath` in `e2e/playwright.config.ts`.

---

## What Claude Must Never Do

- Add Redux, Zustand, Jotai, Recoil, or any state manager beyond React Context.
- Add `tailwind.config.ts`, `postcss.config.*`, or any CSS preprocessor.
- Write inline `style={{...}}` props — use Tailwind classes.
- Use default exports.
- Fetch data inside a component — only pages and context may call the API.
- Skip Zod validation on any `req.body`.
- Interpolate user input directly into SQL strings.
- Return internal error details from Express error handler.
- Use `better-sqlite3` or any synchronous DB client.
- Add authentication or auth middleware — explicitly deferred to a future iteration.
- Commit, log, or hardcode `ANTHROPIC_API_KEY` or any other secret.

---

## Claude API Integration

Anthropic SDK lives in `server/`. New capabilities follow this pattern:
- New route file: `server/src/routes/<feature>.ts`
- Register router in `server/src/app.ts`
- New client API module: `client/src/api/<feature>.ts`

Choices already made — do not change without discussion:
| Setting | Value | Reason |
|---|---|---|
| Standard model | `claude-sonnet-4-6` | Fast and cost-effective for insights |
| Deep analysis model | `claude-opus-4-7` | Adaptive thinking for complex reasoning |
| Thinking mode | `thinking: { type: 'enabled', budget_tokens: 10000 }` | SDK requires `enabled`; `adaptive` is not a valid SDK type |
| Prompt caching | `cache_control: { type: 'ephemeral' }` on system prompt | Reduces cost on repeated calls |
| Rate limit | 5 req / 10 min | Prevents runaway API spend |
| API key source | `process.env.ANTHROPIC_API_KEY` only | Never hardcoded |

---

## Environment

`server/.env` (gitignored — never commit):
```
PORT=3001
DB_PATH=./data.db
ANTHROPIC_API_KEY=          # Required for AI features
STATIC_PATH=                # Set to /app/public in Docker production
CLIENT_ORIGIN=              # CORS origin (defaults to http://localhost:5173)
```

The `.env` file and all `*.db` / `*.db-journal` files are gitignored and must never be committed.

---

## Git Workflow

- **Feature branches**: every issue or feature gets its own branch off `develop`, named `feature/<short-description>` or `claude/issue-<number>-<short-description>`.
- **Merge approval required**: never merge any branch into `develop` or `main` without explicit user approval. Always stop and ask before merging.
- Development branches are pushed and a PR is opened for review; merging is a human decision.

---

## Key Decisions (Architecture Log)

- `@libsql/client` over `better-sqlite3`: avoids native compilation issues on Windows (Node 24 + node-gyp).
- Tailwind v4 via Vite plugin: no PostCSS config needed.
- React Context only: scope does not justify a state library.
- Named exports everywhere: makes refactoring and tree-shaking predictable.
- Zod at the route boundary: validation lives next to the handler, not in a separate layer.
- `tokenTracker.ts` is an in-memory singleton — sufficient for dev sessions; production usage tracking belongs in a DB table.
- `express.json({ limit: '110kb' })` — raised above 10 kb default to allow CSV import payloads (Zod caps CSV at 100 k chars).
- Batch `IdSchema` uses `.max(64).regex(/^[a-zA-Z0-9_-]+$/)` before forwarding to the Anthropic API.
