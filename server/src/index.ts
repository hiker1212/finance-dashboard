import 'dotenv/config'
import { app } from './app'
import { initDb } from './db'

const PORT = process.env.PORT ?? 3001

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
  })
