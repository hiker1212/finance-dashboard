import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import rateLimit from 'express-rate-limit'
import { db } from '../db'
import { recordUsage } from '../tokenTracker'

export const analysisRouter = Router()

analysisRouter.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
}))

const client = new Anthropic()

const BodySchema = z.object({
  months: z.number().int().min(1).max(6).optional().default(3),
})

const SYSTEM_PROMPT = `You are an expert personal finance analyst performing a deep, multi-month analysis of a user's financial data.

Your task is to provide a comprehensive, insightful analysis covering:
1. Spending trends and patterns across the months
2. Income stability and growth
3. Savings rate trajectory
4. Category-level insights — what's improving, what's worsening
5. Budget adherence over time
6. Concrete, prioritised recommendations for the next 1–3 months
7. An overall financial health narrative

Write in clear, readable prose with short paragraphs. Use specific numbers from the data. Be honest about weaknesses while acknowledging strengths. Aim for 400–600 words — thorough but not exhausting.`

async function buildMonthSummary(month: string) {
  const [totals, byCategory] = await Promise.all([
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
  ])

  const income = Number(totals.rows[0].total_income)
  const expenses = Number(totals.rows[0].total_expenses)

  return {
    month,
    income,
    expenses,
    net: income - expenses,
    savings_rate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    by_category: byCategory.rows,
  }
}

async function fetchMonthRows(months: number) {
  return db.execute({
    sql: `SELECT DISTINCT strftime('%Y-%m', date) AS month
          FROM transactions
          ORDER BY month DESC
          LIMIT ?`,
    args: [months],
  })
}

analysisRouter.post('/', async (req, res, next) => {
  try {
    const { months } = BodySchema.parse(req.body)

    const monthRows = await fetchMonthRows(months)

    if (monthRows.rows.length === 0) {
      res.status(400).json({ error: 'No transaction data found.' })
      return
    }

    const monthLabels = monthRows.rows.map(r => r.month as string)
    const summaries = await Promise.all(monthLabels.map(buildMonthSummary))

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      system: [{
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      }],
      messages: [{
        role: 'user',
        content: `Please analyse my finances across the following ${summaries.length} month(s):\n\n${JSON.stringify(summaries, null, 2)}`,
      }],
    })

    recordUsage('analysis', response.usage)

    const thinkingText = response.content
      .filter(block => block.type === 'thinking')
      .map(block => (block as Anthropic.ThinkingBlock).thinking)
      .join('\n\n')

    const analysisText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n\n')

    res.json({
      thinking: thinkingText,
      analysis: analysisText,
      months_analyzed: summaries.length,
    })
  } catch (err) {
    next(err)
  }
})

analysisRouter.post('/stream', async (req, res, next) => {
  try {
    const { months } = BodySchema.parse(req.body)

    const monthRows = await fetchMonthRows(months)

    if (monthRows.rows.length === 0) {
      res.status(400).json({ error: 'No transaction data found.' })
      return
    }

    const monthLabels = monthRows.rows.map(r => r.month as string)
    const summaries = await Promise.all(monthLabels.map(buildMonthSummary))

    // Commit to SSE — errors before this still return JSON
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
      const stream = client.messages.stream({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        thinking: { type: 'enabled', budget_tokens: 10000 },
        system: [{
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        }],
        messages: [{
          role: 'user',
          content: `Please analyse my finances across the following ${summaries.length} month(s):\n\n${JSON.stringify(summaries, null, 2)}`,
        }],
      })

      const finalMsgPromise = stream.finalMessage()

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'thinking_delta') {
            res.write(`data: ${JSON.stringify({ type: 'thinking', chunk: event.delta.thinking })}\n\n`)
          } else if (event.delta.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ type: 'text', chunk: event.delta.text })}\n\n`)
          }
        }
      }

      const finalMsg = await finalMsgPromise
      recordUsage('analysis_stream', finalMsg.usage)
      res.write(`data: ${JSON.stringify({ type: 'done', months_analyzed: summaries.length })}\n\n`)
      res.end()
    } catch (streamErr) {
      res.write(`event: error\ndata: ${JSON.stringify(streamErr instanceof Error ? streamErr.message : 'Stream error')}\n\n`)
      res.end()
    }
  } catch (err) {
    next(err)
  }
})
