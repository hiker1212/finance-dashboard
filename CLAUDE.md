# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Dashboard — a monorepo with a React frontend and Express backend. Built as a learning project to explore Claude Code capabilities end-to-end.

## Structure

```
finance-dashboard/
├── client/    # React 19 + Vite + TypeScript + Tailwind CSS v4
└── server/    # Express + TypeScript + @libsql/client (SQLite)
```

All commands must be run from within the respective subdirectory (`client/` or `server/`).

## Commands

### Server (`cd server`)
```bash
npm run dev       # Start with tsx watch (hot reload)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output
npm test          # Run Vitest tests once
```

### Client (`cd client`)
```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Type-check + Vite production build
npm run lint      # Run ESLint
npm run preview   # Serve production build locally
```

### Run a single test
```bash
# Server
npx vitest run src/routes/transactions.test.ts

# Client (once Vitest is added)
npx vitest run src/components/TransactionForm.test.tsx
```

## Architecture

### API proxy
The Vite dev server proxies `/api/*` → `http://localhost:3001`. The server must be running on port 3001 for the frontend to work in dev. In production, the Express server serves the built client from `dist/`.

### Database
Uses `@libsql/client` (LibSQL/Turso) with a local SQLite file at `server/data.db`. All DB calls are async (Promise-based) — unlike `better-sqlite3`, there is no synchronous API. The client is initialized once in `server/src/db.ts` and imported where needed.

### Module systems
- **Server**: CommonJS (`"module": "CommonJS"` in tsconfig). Use `require`-style imports compile to CJS; source uses `import/export`.
- **Client**: ESM (`"type": "module"` in package.json). Bundled by Vite.

### Styling
Tailwind CSS v4 — configured via the `@tailwindcss/vite` plugin (no `tailwind.config.ts` needed). The single entry point is `client/src/index.css` which contains only `@import "tailwindcss";`. Do not add a PostCSS config.

### Validation
All API request bodies are validated with Zod schemas defined alongside their route handlers. Never skip Zod validation on incoming data.

## Environment

The server reads from a `.env` file at `server/.env` (loaded by `dotenv`). Required variables will be documented there. The `.env` file and `*.db` files are gitignored.

## Key decisions
- `@libsql/client` over `better-sqlite3`: avoids native compilation on Windows (Node 24 + node-gyp incompatibility).
- Tailwind v4 via Vite plugin: no PostCSS config, no `tailwind.config.ts`.
- React Context for global state: no Redux or Zustand — scope doesn't justify it.
