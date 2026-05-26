import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const summaryRouter = Router()

const MonthParam = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')

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
