import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { db } from '../db'

export const insightsRouter = Router()

insightsRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many insight requests — please try again later.' },
}))

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a personal finance advisor analyzing a user's monthly spending data.
Given a JSON summary of their income, expenses, and category breakdowns plus a transaction list,
produce 3-5 concise, actionable insights. Focus on:
- Spending patterns and anomalies
- Budget adherence (flag categories over or near limit)
- Net savings health
- One specific, practical recommendation

Format your response as plain prose with short paragraphs. No bullet lists, no markdown headers.
Keep it under 200 words and conversational — like a brief note from a trusted advisor.`

const BodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
})

async function buildSummary(month: string) {
  const [totals, byCategory, transactions] = await Promise.all([
    db.execute({
      sql: `SELECT
              COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
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
    db.execute({
      sql: `SELECT t.date, t.type, t.amount, t.description, c.name AS category
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE strftime('%Y-%m', t.date) = ?
            ORDER BY t.date DESC`,
      args: [month],
    }),
  ])
  return {
    month,
    total_income: totals.rows[0].total_income,
    total_expenses: totals.rows[0].total_expenses,
    net: Number(totals.rows[0].total_income) - Number(totals.rows[0].total_expenses),
    by_category: byCategory.rows,
    transactions: transactions.rows,
  }
}

const MESSAGE_PARAMS = (summaryJson: string) => ({
  model: 'claude-sonnet-4-6' as const,
  max_tokens: 512,
  system: [{ type: 'text' as const, text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } }],
  messages: [{ role: 'user' as const, content: summaryJson }],
})

insightsRouter.post('/', async (req, res, next) => {
  try {
    const { month } = BodySchema.parse(req.body)
    const summary = await buildSummary(month)
    const message = await client.messages.create(
      MESSAGE_PARAMS(`Here is my financial data for ${month}:\n\n${JSON.stringify(summary, null, 2)}`)
    )
    const block = message.content[0]
    res.json({ insights: block.type === 'text' ? block.text : '' })
  } catch (err) {
    next(err)
  }
})

insightsRouter.post('/stream', async (req, res, next) => {
  try {
    const { month } = BodySchema.parse(req.body)
    const summary = await buildSummary(month)

    // Commit to SSE only after DB succeeds — errors before this still return JSON
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const stream = client.messages.stream(
      MESSAGE_PARAMS(`Here is my financial data for ${month}:\n\n${JSON.stringify(summary, null, 2)}`)
    )

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify(text)}\n\n`)
    })

    stream.on('error', (err) => {
      res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`)
      res.end()
    })

    stream.on('finalMessage', () => {
      res.write('data: [DONE]\n\n')
      res.end()
    })
  } catch (err) {
    // Only reached if body parse or DB query fails before headers are flushed
    next(err)
  }
})
