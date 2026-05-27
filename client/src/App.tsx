import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Budgets } from './pages/Budgets'
import { Analytics } from './pages/Analytics'
import { Chat } from './pages/Chat'
import { BatchScore } from './pages/BatchScore'
import { Import } from './pages/Import'
import { Usage } from './pages/Usage'
import { Analysis } from './pages/Analysis'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="chat" element={<Chat />} />
          <Route path="batch" element={<BatchScore />} />
          <Route path="import" element={<Import />} />
          <Route path="usage" element={<Usage />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
