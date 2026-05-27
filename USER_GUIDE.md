# User Guide — Finance Dashboard

## Prerequisites

- Node.js 18+
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com) *(required only for AI features)*

---

## Starting the app

Open two terminals:

```bash
# Terminal 1 — backend (port 3001)
cd server
cp .env.example .env          # first time only
# edit .env and add: ANTHROPIC_API_KEY=sk-ant-...
npm install                   # first time only
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm install                   # first time only
npm run dev
```

Open **http://localhost:5173**.

The Vite dev server proxies `/api/*` to port 3001 automatically — you never call the backend directly from the browser.

### Seed realistic data

With the server running, open Claude Code in this project directory and run:

```
/seed
```

This creates 5 categories, 5 budget limits, and 44 transactions spread across the last 3 months.

---

## Pages

### Dashboard (`/`)

**What it shows:** KPI cards for the selected month (income, expenses, net savings), a spending pie chart, a 6-month income/expense trend chart, and the 5 most recent transactions.

**Month selector:** The date input top-right controls which month all cards and charts display. Changing it updates every section simultaneously — it is stored in global context so other pages inherit the same month.

**PDF export:** Click **⬇ PDF** to download a one-page summary report for the selected month.

**Monthly Score** *(requires API key)*
Click **Score this month** to get an AI-generated financial grade:
- Letter grade (A–F) and score out of 10
- Savings rate and risk level badge
- 2–3 specific strengths (green ✓)
- 2–3 specific warnings (amber ⚠)
- One-sentence verdict

The score uses `tool_choice` to force a strictly typed JSON response — grade will always be one of A/B/C/D/F, risk will always be low/medium/high.

**AI Spending Insights** *(requires API key)*
Click **Generate insights** to stream a 150–200 word narrative analysis of your spending. Text appears word-by-word as it arrives (SSE streaming). Click **Refresh** to regenerate.

---

### Transactions (`/transactions`)

**What it shows:** All transactions for the selected month, with inline edit and delete.

**Adding a transaction:**
1. Click **+ Add transaction**
2. Fill in date, description, amount, type (income / expense), and optionally a category
3. Click **Save**

**Editing:** Click the pencil icon on any row. The form pre-fills with existing values. Save replaces the record; Cancel discards changes.

**Deleting:** Click the bin icon. No confirmation dialog — the row disappears immediately.

---

### Budgets (`/budgets`)

**What it shows:** Each category with its monthly budget limit and a progress bar showing actual spending vs the limit for the selected month.

- Green bar: under 70% of budget
- Amber bar: 70–99%
- Red bar: at or over budget

**Setting a budget:** Click **Set limit** next to any category, enter a monthly amount, and save. The progress bar updates immediately.

**Removing a budget:** Click the **×** on an existing limit to remove it. The category remains but the progress bar disappears.

---

### Analytics (`/analytics`)

**What it shows:** Average monthly spending per category across all months in the database, rendered as a horizontal bar chart. Useful for identifying which category consistently consumes the most.

---

### Ask AI (`/chat`) *(requires API key)*

**What it does:** A free-text question box. Claude autonomously decides which DB queries to run (from 4 available tools) to answer your question.

**Example questions to try:**
- *How much did I spend last month?*
- *Which category am I closest to going over budget?*
- *What were my top 3 expenses this month?*
- *Compare this month to last month*

**How to use:**
1. Type a question or click one of the example chips
2. Press Enter or click **Ask**
3. See the answer plus a "Tools used" section showing exactly which tools Claude called and with what inputs

**Under the hood:** Each question triggers an agentic loop. Claude calls tools, receives results, and may call more tools before writing a final answer. The tool badges show the full reasoning chain.

---

### Batch Score (`/batch`) *(requires API key)*

**What it does:** Scores every month in the database at once using the Anthropic Batch API — 50% cheaper than individual requests, processed asynchronously.

**How to use:**
1. Click **Score all months**
2. A `batch_id` appears immediately (the job has been submitted)
3. The page polls every 5 seconds — watch the progress counter
4. When `processing_status === "ended"`, a grid of score cards appears — one per month

**Important:** Batch processing typically takes 1–5 minutes. If you navigate away, the batch continues running at Anthropic; you can return to this page and the UI will re-poll if the batch_id is still in state.

---

### Import Statement (`/import`) *(requires API key)*

**What it does:** Paste a bank statement CSV and let Claude extract structured transactions. You review the extracted rows, deselect any you don't want, then import the rest into the database.

**Format accepted:** Any CSV where Claude can identify columns for date, description, amount, and credit/debit type. Headers are not required but help. Example:

```
Date,Description,Amount,Type
2026-05-01,Monthly Salary,3200.00,credit
2026-05-05,Supermarket,87.50,debit
```

**How to use:**
1. Click **Use sample statement** to auto-fill a 12-row example, or paste your own CSV
2. Click **Extract transactions**
3. Review the preview table — deselect rows you don't want with the checkboxes
4. Click **Import N selected**
5. Transactions appear immediately on the Transactions page

**What happens internally:** The CSV is uploaded to Anthropic's Files API, referenced by `file_id` in a message (not re-sent inline), Claude extracts transactions via forced tool call, then the file is deleted.

---

### Deep Analysis (`/analysis`) *(requires API key, uses claude-opus-4-7)*

**What it does:** A comprehensive multi-month financial analysis using Claude's most capable model with extended thinking enabled. The model reasons through your data before writing the final answer.

**How to use:**
1. Click **Analyse last 3 months**
2. Wait 15–30 seconds (Opus with extended thinking takes longer than Sonnet)
3. Read the prose analysis
4. Click **▶ Model's reasoning (N chars)** to expand the thinking section — this is the model's internal deliberation before it wrote the answer

**What "adaptive thinking" means:** The model decides how much internal reasoning to spend based on question complexity. For a multi-month financial overview it will typically spend several thousand tokens thinking before writing the final ~400 word analysis.

**Cost note:** This uses `claude-opus-4-7`, which is significantly more expensive than `claude-sonnet-4-6`. The Usage page will reflect the higher per-token cost.

---

### Token Usage (`/usage`) *(requires API key for most features)*

**What it shows:** A table of every AI feature you've used since the server started, with columns for:
- API calls made
- Input tokens consumed
- Output tokens consumed
- Cache writes (tokens stored in prompt cache, costs 125% of input price — one-time)
- Cache reads (tokens served from cache, costs 10% of input price — recurring)
- Estimated cost
- Cache savings (how much you saved vs no-cache baseline)

**Live token counter:** Type any text into the textarea at the bottom. The token count and estimated input cost update 600ms after you stop typing, using `messages.countTokens()` — a free pre-flight API that counts tokens without spending credits.

**Refreshing:** Click **Refresh** to pull the latest counts. The counter resets when the server restarts.

---

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Submit message in Ask AI | Enter |
| Cancel a form | Esc (or Cancel button) |

---

## Environment variables (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3001) |
| `DB_PATH` | No | SQLite file path (default: `./data.db`) |
| `ANTHROPIC_API_KEY` | For AI features | Your Anthropic API key |
| `STATIC_PATH` | Production only | Path to built client (set by Dockerfile) |
| `CLIENT_ORIGIN` | No | CORS origin (default: `http://localhost:5173`) |

---

## Running tests

```bash
# Server integration tests (Vitest + Supertest)
cd server && npm test

# Single test file
cd server && npx vitest run src/routes/transactions.test.ts

# E2E tests (requires both servers running)
cd e2e && npx playwright test
```

---

## Resetting the database

```
/reset-db
```

Wipes all transactions, budgets, and categories. Re-run `/seed` to repopulate.
