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

describe('GET /api/categories', () => {
  it('returns empty array when no categories exist', async () => {
    const res = await request(app).get('/api/categories')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns categories sorted by name', async () => {
    await db.execute({ sql: 'INSERT INTO categories (name) VALUES (?)', args: ['Zebra'] })
    await db.execute({ sql: 'INSERT INTO categories (name) VALUES (?)', args: ['Apple'] })
    const res = await request(app).get('/api/categories')
    expect(res.status).toBe(200)
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Apple', 'Zebra'])
  })
})

describe('POST /api/categories', () => {
  it('creates a category with default color', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Food' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Food')
    expect(res.body.color).toBe('#6366f1')
    expect(res.body.id).toBeDefined()
  })

  it('creates a category with a custom color', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Transport', color: '#ff5500' })
    expect(res.status).toBe(201)
    expect(res.body.color).toBe('#ff5500')
  })

  it('returns 409 for duplicate category name', async () => {
    await request(app).post('/api/categories').send({ name: 'Food' })
    const res = await request(app).post('/api/categories').send({ name: 'Food' })
    expect(res.status).toBe(409)
  })

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/categories').send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid color format', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Food', color: 'red' })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/categories/:id', () => {
  it('updates name and color', async () => {
    const { body: cat } = await request(app).post('/api/categories').send({ name: 'Food' })
    const res = await request(app)
      .put(`/api/categories/${cat.id}`)
      .send({ name: 'Groceries', color: '#00cc00' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Groceries')
    expect(res.body.color).toBe('#00cc00')
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/categories/9999')
      .send({ name: 'Ghost', color: '#000000' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/categories/:id', () => {
  it('deletes the category', async () => {
    const { body: cat } = await request(app).post('/api/categories').send({ name: 'Food' })
    const del = await request(app).delete(`/api/categories/${cat.id}`)
    expect(del.status).toBe(204)
    const list = await request(app).get('/api/categories')
    expect(list.body).toHaveLength(0)
  })
})
