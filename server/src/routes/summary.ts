import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const summaryRouter = Router()

const MonthParam = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')

const RangeQuery = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}$/, 'from must be YYYY-MM'),
    to:   z.string().regex(/^\d{4}-\d{2}$/, 'to must be YYYY-MM'),
  })
  .refine(d => d.from <= d.to, { message: 'from must be ≤ to' })

summaryRouter.get('/range', async (req, res, next) => {
  try {
    const parsed = RangeQuery.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const { from, to } = parsed.data

    const [totals, byCategory] = await Promise.all([
      db.execute({
        sql: `SELECT
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                COUNT(*) AS transaction_count
              FROM transactions
              WHERE strftime('%Y-%m', date) >= ? AND strftime('%Y-%m', date) <= ?`,
        args: [from, to],
      }),
      db.execute({
        sql: `SELECT
                c.id,
                c.name,
                c.color,
                COALESCE(SUM(t.amount), 0) AS spent,
                b.monthly_limit
              FROM categories c
              LEFT JOIN transactions t
                ON t.category_id = c.id
                AND t.type = 'expense'
                AND strftime('%Y-%m', t.date) >= ?
                AND strftime('%Y-%m', t.date) <= ?
              LEFT JOIN budgets b ON b.category_id = c.id
              GROUP BY c.id
              ORDER BY spent DESC`,
        args: [from, to],
      }),
    ])

    res.json({
      from,
      to,
      ...totals.rows[0],
      by_category: byCategory.rows,
    })
  } catch (err) {
    next(err)
  }
})

summaryRouter.get('/', async (req, res, next) => {
  try {
    const month = MonthParam.parse(
      req.query.month ?? new Date().toISOString().slice(0, 7)
    )

    const [totals, byCategory] = await Promise.all([
      db.execute({
        sql: `SELECT
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
                COUNT(*) AS transaction_count
              FROM transactions
              WHERE strftime('%Y-%m', date) = ?`,
        args: [month],
      }),
      db.execute({
        sql: `SELECT
                c.id,
                c.name,
                c.color,
                COALESCE(SUM(t.amount), 0) AS spent,
                b.monthly_limit
              FROM categories c
              LEFT JOIN transactions t
                ON t.category_id = c.id
                AND t.type = 'expense'
                AND strftime('%Y-%m', t.date) = ?
              LEFT JOIN budgets b ON b.category_id = c.id
              GROUP BY c.id
              ORDER BY spent DESC`,
        args: [month],
      }),
    ])

    res.json({
      month,
      ...totals.rows[0],
      by_category: byCategory.rows,
    })
  } catch (err) {
    next(err)
  }
})
