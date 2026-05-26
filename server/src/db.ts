import { createClient } from '@libsql/client'
import path from 'path'

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data.db')

export const db = createClient({ url: `file:${dbPath}` })

export async function initDb(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL UNIQUE,
      color   TEXT    NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      amount      REAL    NOT NULL,
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      description TEXT    NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      date        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id    INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
      monthly_limit  REAL    NOT NULL
    )
  `)
}
