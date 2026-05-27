import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { db } from '../db'

export const batchRouter = Router()

batchRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

// Shared tool definition — same as score.ts so results are identical in shape
const SCORE_TOOL: Anthropic.Tool = {
  name: 'score_month',
  description: 'Score the financial health for the month and populate all fields with precise values.',
  input_schema: {
    type: 'object' as const,
    properties: {
      overall_score: { type: 'number' },
      grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
      savings_rate: { type: 'number' },
      risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
      strengths: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      warnings: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
      verdict: { type: 'string' },
    },
    required: ['overall_score', 'grade', 'savings_rate', 'risk_level', 'strengths', 'warnings', 'verdict'],
  },
}

const SYSTEM = 'You are a precise personal finance analyst. Score the user\'s financial month using only the data provided. Be specific — reference actual numbers in strengths and warnings.'

// POST /api/batch — build one score request per month and submit as a batch
batchRouter.post('/', async (req, res, next) => {
  try {
    // Find every month that has at least one transaction
    const monthRows = await db.execute(
      `SELECT DISTINCT strftime('%Y-%m', date) AS month FROM transactions ORDER BY month DESC`
    )
    const months = monthRows.rows.map(r => r.month as string)
    if (months.length === 0) {
      res.status(400).json({ error: 'No transaction data found — seed the database first.' })
      return
    }

    // Pre-fetch summary data for each month in parallel
    const summaries = await Promise.all(months.map(async (month) => {
      const [totals, byCategory] = await Promise.all([
        db.execute({
          sql: `SELECT
                  COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS income,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses
                FROM transactions WHERE strftime('%Y-%m', date) = ?`,
          args: [month],
        }),
        db.execute({
          sql: `SELECT c.name, COALESCE(SUM(t.amount),0) AS spent, b.monthly_limit
                FROM categories c
                LEFT JOIN transactions t
                  ON t.category_id = c.id AND t.type = 'expense'
                  AND strftime('%Y-%m', t.date) = ?
                LEFT JOIN budgets b ON b.category_id = c.id
                GROUP BY c.id ORDER BY spent DESC`,
          args: [month],
        }),
      ])
      const income = Number(totals.rows[0].income)
      const expenses = Number(totals.rows[0].expenses)
      return { month, income, expenses, net: income - expenses, by_category: byCategory.rows }
    }))

    // One batch request per month — custom_id is the month string so we can match results later
    const requests: Anthropic.Messages.MessageCreateParamsNonStreaming[] = summaries.map(summary => ({
      model: 'claude-sonnet-4-6' as const,
      max_tokens: 1024,
      system: [{ type: 'text' as const, text: SYSTEM, cache_control: { type: 'ephemeral' as const } }],
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool' as const, name: 'score_month' },
      messages: [{
        role: 'user' as const,
        content: `Score my finances for ${summary.month}:\n\n${JSON.stringify(summary, null, 2)}`,
      }],
    }))

    const batch = await client.messages.batches.create({
      requests: requests.map((params, i) => ({ custom_id: summaries[i].month, params })),
    })

    res.status(202).json({
      batch_id: batch.id,
      request_count: months.length,
      months,
      processing_status: batch.processing_status,
      created_at: batch.created_at,
      expires_at: batch.expires_at,
    })
  } catch (err) {
    next(err)
  }
})

const IdSchema = z.object({ id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/) })

// GET /api/batch/:id — poll for status
batchRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = IdSchema.parse(req.params)
    const batch = await client.messages.batches.retrieve(id)
    res.json({
      batch_id: batch.id,
      processing_status: batch.processing_status,
      request_counts: batch.request_counts,
      ended_at: batch.ended_at,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/batch/:id/results — retrieve results (only meaningful when processing_status === 'ended')
batchRouter.get('/:id/results', async (req, res, next) => {
  try {
    const { id } = IdSchema.parse(req.params)

    const scores: Array<{ month: string; score: unknown; error?: string }> = []

    for await (const item of await client.messages.batches.results(id)) {
      if (item.result.type === 'succeeded') {
        const block = item.result.message.content.find(b => b.type === 'tool_use')
        scores.push({
          month: item.custom_id,
          score: block?.type === 'tool_use' ? block.input : null,
        })
      } else {
        scores.push({ month: item.custom_id, score: null, error: item.result.type })
      }
    }

    scores.sort((a, b) => b.month.localeCompare(a.month))
    res.json({ scores })
  } catch (err) {
    next(err)
  }
})
