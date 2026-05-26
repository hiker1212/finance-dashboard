import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { db, initDb } from '../db'

beforeAll(async () => { await initDb() })

beforeEach(async () => {
  await db.execute('DELETE FROM budgets')
  await db.execute('DELETE FROM transactions')
  await db.execute('DELETE FROM categories')
})

async function seedCategory(name = 'Food', color = '#ff0000') {
  const res = await request(app).post('/api/categories').send({ name, color })
  return res.body as { id: number; name: string; color: string }
}

async function seedTransaction(overrides: Partial<{
  amount: number; type: 'income' | 'expense'; description: string; date: string; category_id: number | null
}> = {}) {
  const payload = {
    amount: 50,
    type: 'expense' as const,
    description: 'Lunch',
    date: '2025-05-15',
    category_id: null,
    ...overrides,
  }
  const res = await request(app).post('/api/transactions').send(payload)
  return res.body
}

describe('GET /api/transactions', () => {
  it('returns empty array when no transactions', async () => {
    const res = await request(app).get('/api/transactions')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('lists all transactions', async () => {
    await seedTransaction({ description: 'A' })
    await seedTransaction({ description: 'B' })
    const res = await request(app).get('/api/transactions')
    expect(res.body).toHaveLength(2)
  })

  it('filters by month', async () => {
    await seedTransaction({ date: '2025-05-01', description: 'May' })
    await seedTransaction({ date: '2025-06-01', description: 'June' })
    const res = await request(app).get('/api/transactions?month=2025-05')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].description).toBe('May')
  })

  it('includes category name and color when category is set', async () => {
    const cat = await seedCategory('Food', '#ff0000')
    await seedTransaction({ category_id: cat.id })
    const res = await request(app).get('/api/transactions')
    expect(res.body[0].category_name).toBe('Food')
    expect(res.body[0].category_color).toBe('#ff0000')
  })
})

describe('POST /api/transactions', () => {
  it('creates an expense', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 12.50,
      type: 'expense',
      description: 'Coffee',
      date: '2025-05-20',
      category_id: null,
    })
    expect(res.status).toBe(201)
    expect(res.body.amount).toBe(12.5)
    expect(res.body.type).toBe('expense')
    expect(res.body.description).toBe('Coffee')
  })

  it('creates an income transaction', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 3000,
      type: 'income',
      description: 'Salary',
      date: '2025-05-01',
    })
    expect(res.status).toBe(201)
    expect(res.body.type).toBe('income')
  })

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: -10,
      type: 'expense',
      description: 'Bad',
      date: '2025-05-01',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 10,
      type: 'expense',
      description: 'Bad date',
      date: '05/20/2025',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 10,
      type: 'savings',
      description: 'Wrong type',
      date: '2025-05-01',
    })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/transactions/:id', () => {
  it('updates a transaction', async () => {
    const tx = await seedTransaction({ amount: 10, description: 'Old' })
    const res = await request(app).put(`/api/transactions/${tx.id}`).send({
      amount: 99,
      type: 'income',
      description: 'Updated',
      date: '2025-05-10',
    })
    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(99)
    expect(res.body.description).toBe('Updated')
  })

  it('returns 404 for unknown transaction', async () => {
    const res = await request(app).put('/api/transactions/9999').send({
      amount: 5,
      type: 'expense',
      description: 'Ghost',
      date: '2025-05-01',
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/transactions/:id', () => {
  it('deletes a transaction', async () => {
    const tx = await seedTransaction()
    const del = await request(app).delete(`/api/transactions/${tx.id}`)
    expect(del.status).toBe(204)
    const list = await request(app).get('/api/transactions')
    expect(list.body).toHaveLength(0)
  })
})
