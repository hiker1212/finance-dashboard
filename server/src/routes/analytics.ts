import { Router } from 'express'
import { db } from '../db'

export const analyticsRouter = Router()

analyticsRouter.get('/monthly-by-category', async (_req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT
              c.id,
              c.name,
              c.color,
              COALESCE(
                CAST(SUM(t.amount) AS REAL) / NULLIF(COUNT(DISTINCT strftime('%Y-%m', t.date)), 0),
                0
              ) AS avg_monthly_spending,
              b.monthly_limit
            FROM categories c
            LEFT JOIN transactions t
              ON t.category_id = c.id AND t.type = 'expense'
            LEFT JOIN budgets b
              ON b.category_id = c.id
            GROUP BY c.id
            ORDER BY avg_monthly_spending DESC`,
      args: [],
    })
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})
