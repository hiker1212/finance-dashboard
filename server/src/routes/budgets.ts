import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const budgetsRouter = Router()

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const BudgetSchema = z.object({
  monthly_limit: z.number().positive(),
})

budgetsRouter.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT b.*, c.name AS category_name, c.color AS category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      ORDER BY c.name
    `)
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// Upsert — create or update budget for a category
budgetsRouter.put('/:categoryId', async (req, res, next) => {
  try {
    const categoryId = parseId(req.params.categoryId)
    if (categoryId === null) { res.status(400).json({ error: 'Invalid ID' }); return }
    const data = BudgetSchema.parse(req.body)
    const result = await db.execute({
      sql: `INSERT INTO budgets (category_id, monthly_limit) VALUES (?, ?)
            ON CONFLICT(category_id) DO UPDATE SET monthly_limit = excluded.monthly_limit
            RETURNING *`,
      args: [categoryId, data.monthly_limit],
    })
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

budgetsRouter.delete('/:categoryId', async (req, res, next) => {
  try {
    const categoryId = parseId(req.params.categoryId)
    if (categoryId === null) { res.status(400).json({ error: 'Invalid ID' }); return }
    await db.execute({ sql: 'DELETE FROM budgets WHERE category_id = ?', args: [categoryId] })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
