import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const transactionsRouter = Router()

const MonthParam = z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const TransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1).max(200),
  category_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
})

transactionsRouter.get('/', async (req, res, next) => {
  try {
    const rawMonth = req.query.month as string | undefined
    const month = rawMonth ? MonthParam.parse(rawMonth) : undefined

    let sql = `
      SELECT t.*, c.name AS category_name, c.color AS category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
    `
    const args: (string | number)[] = []

    if (month) {
      sql += ` WHERE strftime('%Y-%m', t.date) = ?`
      args.push(month)
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC'

    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

transactionsRouter.post('/', async (req, res, next) => {
  try {
    const data = TransactionSchema.parse(req.body)
    const result = await db.execute({
      sql: `INSERT INTO transactions (amount, type, description, category_id, date)
            VALUES (?, ?, ?, ?, ?) RETURNING *`,
      args: [data.amount, data.type, data.description, data.category_id ?? null, data.date],
    })
    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

transactionsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) { res.status(400).json({ error: 'Invalid ID' }); return }
    const data = TransactionSchema.parse(req.body)
    const result = await db.execute({
      sql: `UPDATE transactions
            SET amount = ?, type = ?, description = ?, category_id = ?, date = ?
            WHERE id = ? RETURNING *`,
      args: [data.amount, data.type, data.description, data.category_id ?? null, data.date, id],
    })
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Transaction not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) { res.status(400).json({ error: 'Invalid ID' }); return }
    await db.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
