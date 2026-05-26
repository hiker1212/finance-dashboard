import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { categoriesRouter } from './routes/categories'
import { transactionsRouter } from './routes/transactions'
import { budgetsRouter } from './routes/budgets'
import { summaryRouter } from './routes/summary'
import { insightsRouter } from './routes/insights'
import { errorHandler } from './middleware/errorHandler'

export const app = express()

// Disable CSP when serving the SPA so Vite's module preload works
app.use(helmet({ contentSecurityPolicy: !process.env.STATIC_PATH }))
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '10kb' }))

app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/summary', summaryRouter)
app.use('/api/insights', insightsRouter)

// Serve built client in production (STATIC_PATH is set by the Dockerfile)
const staticPath = process.env.STATIC_PATH
if (staticPath) {
  app.use(express.static(staticPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'))
  })
}

app.use(errorHandler)
