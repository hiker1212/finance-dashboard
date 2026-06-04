# Finance Dashboard

A personal finance tracker built as a hands-on learning project to explore every capability of Claude Code and the Anthropic API — from project scaffolding through streaming, tool use, batch processing, and extended thinking.

→ **[User Guide](USER_GUIDE.md)** — how to run the app and use every feature  
→ **[Learning Arc](LEARNING_ARC.md)** — phase-by-phase log of what was built and why

## What it does

- Log income and expense transactions with categories and dates
- Dashboard with KPI cards, spending pie chart, and 6-month trend chart
- Budget limits per category with visual progress indicators
- PDF export of monthly summaries
- **AI Insights** — streaming narrative analysis of monthly spending (SSE + async generator)
- **Ask AI** — free-text questions answered by an agentic loop with 4 DB tools
- **Monthly Score** — structured A–F grade via forced tool call (guaranteed JSON schema)
- **Batch Score** — score all months at once via the Batch API (50% cheaper, async)
- **Import Statement** — paste a CSV, Claude extracts transactions via Files API
- **Token Usage** — live cost tracking + pre-flight token counter
- **Deep Analysis** — multi-month analysis using claude-opus-4-8 with live streaming extended thinking
- **Receipt Scanner** — photograph a receipt to auto-fill the Add Transaction form (vision / image input)
- **Finance DB MCP** — custom MCP server exposing the SQLite database to Claude Code for autonomous debugging

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `@libsql/client` |
| Testing | Vitest + Supertest (integration) + Playwright (E2E) |
| AI | Anthropic SDK — claude-sonnet-4-6 / claude-opus-4-8 |

## Project structure

```
finance-dashboard/
├── client/          # React frontend (Vite, port 5173)
│   └── src/
│       ├── api/         # Typed fetch modules per resource
│       ├── components/  # Reusable UI components
│       ├── context/     # AppContext (categories, selectedMonth)
│       └── pages/       # One file per route
├── server/          # Express API (port 3001)
│   └── src/
│       ├── routes/      # One file per resource + AI feature
│       ├── middleware/  # Error handler
│       ├── tokenTracker.ts  # In-memory usage accumulator
│       └── db.ts        # LibSQL client + schema init
├── e2e/             # Playwright browser tests
├── .claude/         # Claude Code settings, hooks, slash commands
│   ├── settings.json    # Permissions, hooks, env vars
│   └── commands/        # Custom slash commands
├── .mcp.json        # Project MCP server registration (finance-db inspector)
├── LEARNING_ARC.md  # Phase log with objectives and commit refs
└── USER_GUIDE.md    # How to run and use every feature
```

## Quick start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp server/.env.example server/.env
# Add ANTHROPIC_API_KEY to server/.env for AI features

# 3. Start backend (port 3001)
cd server && npm run dev

# 4. Start frontend (port 5173) — separate terminal
cd client && npm run dev
```

Open **http://localhost:5173**. If running inside a Claude Code session, the database is **seeded automatically** on session start. Otherwise, seed manually:

```
/seed     # in Claude Code — creates categories, budgets, and transactions
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/categories` | List or create categories |
| PUT/DELETE | `/api/categories/:id` | Update or delete a category |
| GET/POST | `/api/transactions` | List (`?month=YYYY-MM`) or create |
| PUT/DELETE | `/api/transactions/:id` | Update or delete a transaction |
| GET | `/api/budgets` | List budgets with category info |
| PUT/DELETE | `/api/budgets/:categoryId` | Upsert or remove a budget |
| GET | `/api/summary?month=YYYY-MM` | Aggregated totals + per-category spending |
| GET | `/api/analytics/monthly-by-category` | Average monthly spend per category |
| POST | `/api/insights` | AI narrative (blocking) |
| POST | `/api/insights/stream` | AI narrative (SSE streaming) |
| POST | `/api/chat` | Agentic Q&A with tool use |
| POST | `/api/score` | Structured monthly grade (forced tool call) |
| POST | `/api/batch` | Create batch score job (all months) |
| GET | `/api/batch/:id` | Poll batch status |
| GET | `/api/batch/:id/results` | Retrieve batch results |
| POST | `/api/import/preview` | Extract transactions from CSV via Files API |
| POST | `/api/analysis` | Deep analysis (one-shot, claude-opus-4-8 + thinking) |
| POST | `/api/analysis/stream` | Deep analysis with live streaming thinking + prose (SSE) |
| POST | `/api/receipt` | Extract transaction data from a receipt image (vision) |
| GET | `/api/usage` | Accumulated token usage + costs |
| POST | `/api/usage/count` | Count tokens without spending credits |

## Environment variables

`server/.env` (gitignored):

```
PORT=3001
DB_PATH=./data.db
ANTHROPIC_API_KEY=          # required for AI features
STATIC_PATH=                # set to /app/public in Docker production
CLIENT_ORIGIN=              # CORS origin (default: http://localhost:5173)
```

## Running tests

```bash
cd server && npm test                          # Vitest + Supertest
cd e2e && npx playwright test                  # E2E (needs both servers running)
```

## Claude Code tooling

This repo ships with Claude Code configuration:

- **`.claude/settings.json`** — hooks, permissions allowlist/deny list, dev env vars injected automatically
- **`.claude/commands/`** — `/seed`, `/reset-db`, `/typecheck` and others available as slash commands inside Claude Code sessions
- **`scripts/auto-seed.sh`** — called by the `SessionStart` hook; seeds the database when empty so every fresh session has demo data immediately
- **`.mcp.json`** + **`server/mcp.ts`** — custom MCP server `finance-db` exposes 4 tools to Claude Code: `get_schema`, `get_row_counts`, `sample_rows`, `run_report`

### Hooks

| Type | Trigger | What it does |
|---|---|---|
| `SessionStart` | New Claude Code session | Checks if DB is empty; seeds 5 categories, 5 budgets, and 36 transactions if so |
| `PreToolUse` | Any `Bash` call running `npm run dev` / `npm start` | Blocks the command if `ANTHROPIC_API_KEY` is set in `server/.env`, preventing accidental live API billing |
| `PostToolUse` | Edit on any `client/` file | Runs ESLint `--fix` on the saved file automatically |
| `PostToolUse` | Edit on any `server/*.test.ts` file | Re-runs just that test file with Vitest |
| `Stop` | Session end | Prints an estimated API cost summary for the session (requires dev server running) |
