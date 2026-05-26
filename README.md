# Finance Dashboard

A personal finance tracker built as a hands-on learning project to explore every capability of Claude Code — from scaffolding and code generation through testing, AI integration, and deployment.

## What it does

- Log income and expense transactions with categories and dates
- Dashboard with KPI cards (income, expenses, net savings) and category spending bars
- Budget limits per category with green/amber/red progress indicators
- Monthly filtering across all views
- Recharts data visualization (spending pie chart, 6-month income/expense trend)
- *(Coming)* PDF/Excel export, AI spending insights

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `@libsql/client` |
| Testing | Vitest + React Testing Library + Supertest |
| AI | Anthropic SDK (`claude-sonnet-4-6`) with prompt caching |

## Project structure

```
finance-dashboard/
├── client/          # React frontend (Vite, port 5173)
│   └── src/
│       ├── api/         # Typed fetch modules per resource
│       ├── components/  # Reusable UI components
│       ├── context/     # AppContext (categories, selectedMonth)
│       └── pages/       # Dashboard, Transactions, Budgets
└── server/          # Express API (port 3001)
    └── src/
        ├── routes/      # categories, transactions, budgets, summary
        ├── middleware/  # Error handler (Zod, SQLite constraints)
        └── db.ts        # LibSQL client + schema init
```

## Getting started

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Start the backend (port 3001)
cd server && npm run dev

# 3. Start the frontend (port 5173) — in a separate terminal
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite dev server proxies `/api/*` to `http://localhost:3001` automatically.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/categories` | List or create categories |
| PUT/DELETE | `/api/categories/:id` | Update or delete a category |
| GET/POST | `/api/transactions` | List (optionally `?month=YYYY-MM`) or create |
| PUT/DELETE | `/api/transactions/:id` | Update or delete a transaction |
| GET | `/api/budgets` | List budgets with category info |
| PUT/DELETE | `/api/budgets/:categoryId` | Upsert or remove a budget |
| GET | `/api/summary?month=YYYY-MM` | Aggregated totals + per-category spending |

## Environment variables

Create `server/.env` (see `server/.env.example`):

```
PORT=3001
DB_PATH=./data.db
```

## Development workflow

Branches follow a phase-based flow:

```
main        ← production baseline
develop     ← integration branch (all phases merge here)
phase/N-*   ← feature branch per phase → PR → develop
```

## Learning journey

This project is built phase-by-phase, each exercising different Claude Code capabilities:

| Phase | Focus |
|-------|-------|
| 1 | Project setup, CLAUDE.md, memory system |
| 2 | Backend API (Express + SQLite) |
| 3 | Frontend core (React, components, Context) |
| 4 | Data visualization (Recharts) |
| 5 | Testing strategy (Vitest, Supertest) |
| 6 | Document export (PDF + Excel) |
| 7 | Claude API integration (AI spending insights) |
| 8 | Code review & security audit |
| 9 | Debugging & browser automation |
| 10 | Deployment |
