import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { initDb } from '../db'

beforeAll(async () => { await initDb() })

describe('POST /api/receipt', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/receipt')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/No image file/i)
  })

  it('returns 400 when a non-image file type is uploaded', async () => {
    const res = await request(app)
      .post('/api/receipt')
      .attach('image', Buffer.from('not an image'), { filename: 'doc.pdf', contentType: 'application/pdf' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when the field name is wrong', async () => {
    const res = await request(app)
      .post('/api/receipt')
      .attach('file', Buffer.from('fake'), { filename: 'img.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(400)
  })
})
