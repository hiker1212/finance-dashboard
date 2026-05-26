import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { categoriesRouter } from './routes/categories'
import { transactionsRouter } from './routes/transactions'
import { budgetsRouter } from './routes/budgets'
import { summaryRouter } from './routes/summary'
import { insightsRouter } from './routes/insights'
import { errorHandler } from './middleware/errorHandler'

export const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '10kb' }))

app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/summary', summaryRouter)
app.use('/api/insights', insightsRouter)

app.use(errorHandler)
