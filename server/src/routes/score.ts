import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { db } from '../db'
import { recordUsage } from '../tokenTracker'

export const scoreRouter = Router()

scoreRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

const BodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
})

// tool_choice forces Claude to call this exact tool — block.input IS the structured response.
// No "respond in JSON" prompting needed; the API enforces the schema.
const SCORE_TOOL: Anthropic.Tool = {
  name: 'score_month',
  description: 'Score the financial health for the month and populate all fields with precise values.',
  input_schema: {
    type: 'object' as const,
    properties: {
      overall_score: { type: 'number', description: 'Financial health score from 1 (very poor) to 10 (excellent)' },
      grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'], description: 'Letter grade for the month' },
      savings_rate: { type: 'number', description: 'Net savings as a percentage of total income; can be negative' },
      risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Overall financial risk level' },
      strengths: {
        type: 'array', items: { type: 'string' },
        minItems: 2, maxItems: 3,
        description: '2-3 specific, concrete financial strengths observed this month',
      },
      warnings: {
        type: 'array', items: { type: 'string' },
        minItems: 2, maxItems: 3,
        description: '2-3 specific warnings or concerns that need attention',
      },
      verdict: { type: 'string', description: 'One concise sentence summarising the month' },
    },
    required: ['overall_score', 'grade', 'savings_rate', 'risk_level', 'strengths', 'warnings', 'verdict'],
  },
}

scoreRouter.post('/', async (req, res, next) => {
  try {
    const { month } = BodySchema.parse(req.body)

    const [totals, byCategory] = await Promise.all([
      db.execute({
        sql: `SELECT
                COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS total_income,
                COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS total_expenses
              FROM transactions WHERE strftime('%Y-%m', date) = ?`,
        args: [month],
      }),
      db.execute({
        sql: `SELECT c.name,
                COALESCE(SUM(t.amount), 0) AS spent,
                b.monthly_limit
              FROM categories c
              LEFT JOIN transactions t
                ON t.category_id = c.id AND t.type = 'expense'
                AND strftime('%Y-%m', t.date) = ?
              LEFT JOIN budgets b ON b.category_id = c.id
              GROUP BY c.id ORDER BY spent DESC`,
        args: [month],
      }),
    ])

    const income = Number(totals.rows[0].total_income)
    const expenses = Number(totals.rows[0].total_expenses)
    const summary = { month, income, expenses, net: income - expenses, by_category: byCategory.rows }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{
        type: 'text',
        text: 'You are a precise personal finance analyst. Score the user\'s financial month using only the data provided. Be specific — reference actual numbers from the data in strengths and warnings.',
        cache_control: { type: 'ephemeral' },
      }],
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool', name: 'score_month' },
      messages: [{
        role: 'user',
        content: `Score my finances for ${month}:\n\n${JSON.stringify(summary, null, 2)}`,
      }],
    })

    recordUsage('score', response.usage)
    const block = response.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('No score block in response')

    res.json(block.input)
  } catch (err) {
    next(err)
  }
})
