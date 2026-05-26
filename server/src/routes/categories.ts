import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'

export const categoriesRouter = Router()

const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
})

categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM categories ORDER BY name')
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

categoriesRouter.post('/', async (req, res, next) => {
  try {
    const data = CategorySchema.parse(req.body)
    const result = await db.execute({
      sql: 'INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *',
      args: [data.name, data.color],
    })
    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

categoriesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const data = CategorySchema.parse(req.body)
    const result = await db.execute({
      sql: 'UPDATE categories SET name = ?, color = ? WHERE id = ? RETURNING *',
      args: [data.name, data.color, id],
    })
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

categoriesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
