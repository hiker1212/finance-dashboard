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

async function seedCategory(name = 'Food') {
  const res = await request(app).post('/api/categories').send({ name, color: '#6366f1' })
  return res.body as { id: number }
}

describe('GET /api/budgets', () => {
  it('returns empty array when no budgets', async () => {
    const res = await request(app).get('/api/budgets')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns budgets with category info', async () => {
    const cat = await seedCategory('Food')
    await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 500 })
    const res = await request(app).get('/api/budgets')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].category_name).toBe('Food')
    expect(res.body[0].monthly_limit).toBe(500)
  })
})

describe('PUT /api/budgets/:categoryId', () => {
  it('creates a new budget', async () => {
    const cat = await seedCategory()
    const res = await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 300 })
    expect(res.status).toBe(200)
    expect(res.body.monthly_limit).toBe(300)
    expect(res.body.category_id).toBe(cat.id)
  })

  it('updates an existing budget (upsert)', async () => {
    const cat = await seedCategory()
    await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 300 })
    const res = await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 600 })
    expect(res.status).toBe(200)
    expect(res.body.monthly_limit).toBe(600)
    const list = await request(app).get('/api/budgets')
    expect(list.body).toHaveLength(1)
  })

  it('returns 400 for non-positive limit', async () => {
    const cat = await seedCategory()
    const res = await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown category (FK constraint)', async () => {
    const res = await request(app).put('/api/budgets/9999').send({ monthly_limit: 100 })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/budgets/:categoryId', () => {
  it('removes the budget', async () => {
    const cat = await seedCategory()
    await request(app).put(`/api/budgets/${cat.id}`).send({ monthly_limit: 200 })
    const del = await request(app).delete(`/api/budgets/${cat.id}`)
    expect(del.status).toBe(204)
    const list = await request(app).get('/api/budgets')
    expect(list.body).toHaveLength(0)
  })
})
