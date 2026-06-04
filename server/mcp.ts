import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient } from '@libsql/client'
import { z } from 'zod'
import path from 'path'

const dbPath = process.env.DB_PATH ?? path.join(path.dirname(process.argv[1] ?? __filename), 'data.db')
const db = createClient({ url: `file:${dbPath}` })

const server = new McpServer({ name: 'finance-db', version: '1.0.0' })

// ── Tool: get_schema ──────────────────────────────────────────────────────────

server.tool(
  'get_schema',
  'Returns column definitions for all tables in the finance database (categories, transactions, budgets)',
  async () => {
    const result = await db.execute(
      `SELECT m.name AS table_name, p.name AS column_name, p.type, p."notnull", p.dflt_value, p.pk
       FROM sqlite_master m
       JOIN pragma_table_info(m.name) p
       WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
       ORDER BY m.name, p.cid`
    )

    const tables: Record<string, { name: string; type: string; notNull: boolean; default: unknown; pk: boolean }[]> = {}
    for (const row of result.rows) {
      const t = row.table_name as string
      tables[t] = tables[t] ?? []
      tables[t].push({
        name: row.column_name as string,
        type: row.type as string,
        notNull: Boolean(row.notnull),
        default: row.dflt_value,
        pk: Boolean(row.pk),
      })
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(tables, null, 2) }] }
  }
)

// ── Tool: get_row_counts ──────────────────────────────────────────────────────

server.tool(
  'get_row_counts',
  'Returns the number of rows in each table (categories, transactions, budgets)',
  async () => {
    const [cats, txns, budgets] = await Promise.all([
      db.execute('SELECT COUNT(*) AS n FROM categories'),
      db.execute('SELECT COUNT(*) AS n FROM transactions'),
      db.execute('SELECT COUNT(*) AS n FROM budgets'),
    ])

    const counts = {
      categories: Number(cats.rows[0].n),
      transactions: Number(txns.rows[0].n),
      budgets: Number(budgets.rows[0].n),
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(counts, null, 2) }] }
  }
)

// ── Tool: sample_rows ─────────────────────────────────────────────────────────

server.tool(
  'sample_rows',
  'Returns up to 20 rows from a named table, ordered by id DESC (most recent first)',
  {
    table: z.enum(['categories', 'transactions', 'budgets']),
    limit: z.number().int().min(1).max(20).default(10),
  },
  async ({ table, limit }) => {
    const result = await db.execute({
      sql: `SELECT * FROM ${table} ORDER BY id DESC LIMIT ?`,
      args: [limit],
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.rows, null, 2) }] }
  }
)

// ── Tool: run_report ──────────────────────────────────────────────────────────

const REPORTS: Record<string, string> = {
  monthly_summary: `
    SELECT
      strftime('%Y-%m', date) AS month,
      ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 2) AS income,
      ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS expenses,
      ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END)
           -SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS net
    FROM transactions
    GROUP BY month ORDER BY month DESC LIMIT 12
  `,
  top_expenses: `
    SELECT t.date, t.description, t.amount, c.name AS category
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
    ORDER BY t.amount DESC LIMIT 10
  `,
  category_totals: `
    SELECT c.name, c.color,
      ROUND(SUM(t.amount), 2) AS total_spent,
      COUNT(t.id) AS transaction_count
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense'
    GROUP BY c.id ORDER BY total_spent DESC
  `,
  budget_usage: `
    SELECT c.name, b.monthly_limit,
      ROUND(SUM(CASE WHEN strftime('%Y-%m', t.date) = strftime('%Y-%m','now')
                     THEN t.amount ELSE 0 END), 2) AS spent_this_month,
      ROUND(100.0 * SUM(CASE WHEN strftime('%Y-%m', t.date) = strftime('%Y-%m','now')
                             THEN t.amount ELSE 0 END) / b.monthly_limit, 1) AS pct_used
    FROM categories c
    JOIN budgets b ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense'
    GROUP BY c.id ORDER BY pct_used DESC
  `,
}

server.tool(
  'run_report',
  'Runs one of four pre-approved read-only reports: monthly_summary, top_expenses, category_totals, budget_usage',
  {
    name: z.enum(['monthly_summary', 'top_expenses', 'category_totals', 'budget_usage']),
  },
  async ({ name }) => {
    const sql = REPORTS[name]
    const result = await db.execute(sql)
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.rows, null, 2) }] }
  }
)

// ── Connect ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
server.connect(transport).catch((err: unknown) => {
  process.stderr.write(`finance-db MCP error: ${String(err)}\n`)
  process.exit(1)
})
