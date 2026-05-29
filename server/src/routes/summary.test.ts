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

async function seedCategory(name: string, color = '#6366f1') {
  const res = await request(app).post('/api/categories').send({ name, color })
  return res.body as { id: number }
}

async function seedTransaction(data: {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category_id?: number | null
}) {
  await request(app).post('/api/transactions').send({ ...data, category_id: data.category_id ?? null })
}

describe('GET /api/summary', () => {
  it('returns zeroed totals for an empty month', async () => {
    const res = await request(app).get('/api/summary?month=2025-01')
    expect(res.status).toBe(200)
    expect(Number(res.body.total_income)).toBe(0)
    expect(Number(res.body.total_expenses)).toBe(0)
    expect(Number(res.body.transaction_count)).toBe(0)
    expect(res.body.month).toBe('2025-01')
  })

  it('sums income and expenses for the requested month', async () => {
    await seedTransaction({ amount: 2000, type: 'income', description: 'Salary', date: '2025-05-01' })
    await seedTransaction({ amount: 50, type: 'expense', description: 'Lunch', date: '2025-05-10' })
    await seedTransaction({ amount: 30, type: 'expense', description: 'Coffee', date: '2025-05-15' })
    // Transaction in a different month — should not be included
    await seedTransaction({ amount: 100, type: 'expense', description: 'Other', date: '2025-04-20' })

    const res = await request(app).get('/api/summary?month=2025-05')
    expect(res.status).toBe(200)
    expect(Number(res.body.total_income)).toBe(2000)
    expect(Number(res.body.total_expenses)).toBe(80)
    expect(Number(res.body.transaction_count)).toBe(3)
  })

  it('includes all categories in by_category even with zero spending', async () => {
    const cat = await seedCategory('Rent')
    const res = await request(app).get('/api/summary?month=2025-05')
    expect(res.status).toBe(200)
    const entry = res.body.by_category.find((c: { id: number }) => c.id === cat.id)
    expect(entry).toBeDefined()
    expect(Number(entry.spent)).toBe(0)
  })

  it('reports spending per category', async () => {
    const food = await seedCategory('Food')
    await seedTransaction({ amount: 40, type: 'expense', description: 'Lunch', date: '2025-05-10', category_id: food.id })
    await seedTransaction({ amount: 25, type: 'expense', description: 'Snack', date: '2025-05-12', category_id: food.id })

    const res = await request(app).get('/api/summary?month=2025-05')
    const entry = res.body.by_category.find((c: { id: number }) => c.id === food.id)
    expect(Number(entry.spent)).toBe(65)
  })

  it('reflects the budget limit in by_category', async () => {
    const cat = await seedCategory('Dining')
    await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 200 })

    const res = await request(app).get('/api/summary?month=2025-05')
    const entry = res.body.by_category.find((c: { id: number }) => c.id === cat.id)
    expect(Number(entry.monthly_limit)).toBe(200)
  })

  it('returns 400 for an invalid month format', async () => {
    const res = await request(app).get('/api/summary?month=May-2025')
    expect(res.status).toBe(400)
  })
})

describe('GET /api/summary/range', () => {
  it('returns zeroed totals when no transactions exist in range', async () => {
    const res = await request(app).get('/api/summary/range?from=2025-01&to=2025-03')
    expect(res.status).toBe(200)
    expect(Number(res.body.total_income)).toBe(0)
    expect(Number(res.body.total_expenses)).toBe(0)
    expect(res.body.from).toBe('2025-01')
    expect(res.body.to).toBe('2025-03')
  })

  it('aggregates totals across all months in range', async () => {
    await seedTransaction({ amount: 1000, type: 'income', description: 'Jan salary', date: '2025-01-01' })
    await seedTransaction({ amount: 200,  type: 'expense', description: 'Jan rent',  date: '2025-01-15' })
    await seedTransaction({ amount: 1000, type: 'income', description: 'Feb salary', date: '2025-02-01' })
    await seedTransaction({ amount: 150,  type: 'expense', description: 'Feb food',  date: '2025-02-20' })
    // Outside range — should not appear
    await seedTransaction({ amount: 500, type: 'income', description: 'Mar salary', date: '2025-03-01' })

    const res = await request(app).get('/api/summary/range?from=2025-01&to=2025-02')
    expect(res.status).toBe(200)
    expect(Number(res.body.total_income)).toBe(2000)
    expect(Number(res.body.total_expenses)).toBe(350)
    expect(Number(res.body.transaction_count)).toBe(4)
  })

  it('aggregates by_category spending across range', async () => {
    const food = await seedCategory('Food')
    await seedTransaction({ amount: 40, type: 'expense', description: 'Jan lunch', date: '2025-01-10', category_id: food.id })
    await seedTransaction({ amount: 60, type: 'expense', description: 'Feb lunch', date: '2025-02-10', category_id: food.id })

    const res = await request(app).get('/api/summary/range?from=2025-01&to=2025-02')
    expect(res.status).toBe(200)
    const entry = res.body.by_category.find((c: { id: number }) => c.id === food.id)
    expect(Number(entry.spent)).toBe(100)
  })

  it('returns 400 when from > to', async () => {
    const res = await request(app).get('/api/summary/range?from=2025-06&to=2025-01')
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/api/summary/range?from=January&to=2025-03')
    expect(res.status).toBe(400)
  })

  it('returns 400 when a param is missing', async () => {
    const res = await request(app).get('/api/summary/range?from=2025-01')
    expect(res.status).toBe(400)
  })
})
