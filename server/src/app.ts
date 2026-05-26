import express from 'express'
import cors from 'cors'
import { categoriesRouter } from './routes/categories'
import { transactionsRouter } from './routes/transactions'
import { budgetsRouter } from './routes/budgets'
import { summaryRouter } from './routes/summary'
import { errorHandler } from './middleware/errorHandler'

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/summary', summaryRouter)

app.use(errorHandler)
