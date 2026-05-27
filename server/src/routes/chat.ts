import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { db } from '../db'
import { recordUsage } from '../tokenTracker'

export const chatRouter = Router()

chatRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
})

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_monthly_summary',
    description: 'Get total income, total expenses, and net savings for a specific month.',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
      },
      required: ['month'],
    },
  },
  {
    name: 'get_transactions',
    description: 'List transactions for a month, optionally filtered by category name. Returns date, type, amount, description, and category.',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
        category: { type: 'string', description: 'Category name to filter by (optional)' },
      },
      required: ['month'],
    },
  },
  {
    name: 'get_budget_status',
    description: 'Get each category\'s monthly budget limit versus actual spending for a month. Shows over-budget categories.',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
      },
      required: ['month'],
    },
  },
  {
    name: 'compare_months',
    description: 'Compare income and expenses side-by-side between two months.',
    input_schema: {
      type: 'object' as const,
      properties: {
        month_a: { type: 'string', description: 'First month in YYYY-MM format' },
        month_b: { type: 'string', description: 'Second month in YYYY-MM format' },
      },
      required: ['month_a', 'month_b'],
    },
  },
]

type ToolInput = Record<string, unknown>

async function executeTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'get_monthly_summary': {
      const month = input.month as string
      const result = await db.execute({
        sql: `SELECT
                COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS total_income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS total_expenses,
                COUNT(*) AS transaction_count
              FROM transactions WHERE strftime('%Y-%m', date) = ?`,
        args: [month],
      })
      const row = result.rows[0]
      return JSON.stringify({
        month,
        total_income: row.total_income,
        total_expenses: row.total_expenses,
        net: Number(row.total_income) - Number(row.total_expenses),
        transaction_count: row.transaction_count,
      })
    }

    case 'get_transactions': {
      const month = input.month as string
      const category = input.category as string | undefined
      const sql = category
        ? `SELECT t.date, t.type, t.amount, t.description, c.name AS category
           FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
           WHERE strftime('%Y-%m', t.date) = ? AND c.name = ?
           ORDER BY t.date DESC`
        : `SELECT t.date, t.type, t.amount, t.description, c.name AS category
           FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
           WHERE strftime('%Y-%m', t.date) = ?
           ORDER BY t.date DESC`
      const args = category ? [month, category] : [month]
      const result = await db.execute({ sql, args })
      return JSON.stringify(result.rows)
    }

    case 'get_budget_status': {
      const month = input.month as string
      const result = await db.execute({
        sql: `SELECT c.name,
                COALESCE(SUM(t.amount), 0) AS spent,
                b.monthly_limit,
                CASE WHEN b.monthly_limit IS NOT NULL
                     THEN ROUND((COALESCE(SUM(t.amount),0) / b.monthly_limit) * 100, 1)
                     ELSE NULL END AS pct_used
              FROM categories c
              LEFT JOIN transactions t
                ON t.category_id = c.id AND t.type = 'expense'
                AND strftime('%Y-%m', t.date) = ?
              LEFT JOIN budgets b ON b.category_id = c.id
              GROUP BY c.id ORDER BY spent DESC`,
        args: [month],
      })
      return JSON.stringify(result.rows)
    }

    case 'compare_months': {
      const month_a = input.month_a as string
      const month_b = input.month_b as string
      const result = await db.execute({
        sql: `SELECT
                strftime('%Y-%m', date) AS month,
                COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses
              FROM transactions
              WHERE strftime('%Y-%m', date) IN (?, ?)
              GROUP BY strftime('%Y-%m', date)`,
        args: [month_a, month_b],
      })
      return JSON.stringify(result.rows)
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

export interface ToolCallRecord {
  name: string
  input: ToolInput
}

chatRouter.post('/', async (req, res, next) => {
  try {
    const { question, month } = BodySchema.parse(req.body)

    const SYSTEM = `You are a personal finance assistant with access to the user's financial data via tools.
The user's currently selected month is ${month}. Use that as the default when a month is not specified.
Always call a tool to look up data before answering — never guess numbers.
Be concise, specific, and format currency as $X,XXX.XX.`

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: question },
    ]

    const toolCalls: ToolCallRecord[] = []

    // Agentic loop — cap at 10 iterations to prevent runaway calls
    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      })

      recordUsage('chat', response.usage)
      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        const answer = textBlock?.type === 'text' ? textBlock.text : ''
        res.json({ answer, toolCalls })
        return
      }

      if (response.stop_reason === 'tool_use') {
        // Append assistant turn (contains both text and tool_use blocks)
        messages.push({ role: 'assistant', content: response.content })

        // Execute every tool in this turn and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const input = block.input as ToolInput
            toolCalls.push({ name: block.name, input })
            const result = await executeTool(block.name, input)
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
          }
        }

        // Append tool results as a user turn
        messages.push({ role: 'user', content: toolResults })
      }
    }

    // Safety net: loop exhausted without end_turn
    res.json({ answer: 'Could not produce an answer within the allowed steps.', toolCalls })
  } catch (err) {
    next(err)
  }
})
