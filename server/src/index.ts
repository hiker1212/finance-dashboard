import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb } from './db'
import { categoriesRouter } from './routes/categories'
import { transactionsRouter } from './routes/transactions'
import { budgetsRouter } from './routes/budgets'
import { summaryRouter } from './routes/summary'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/summary', summaryRouter)

app.use(errorHandler)

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })
