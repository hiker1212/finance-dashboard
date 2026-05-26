import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { categoriesApi } from '../api/categories'
import type { Category } from '../types'

interface AppContextValue {
  categories: Category[]
  refreshCategories: () => Promise<void>
  selectedMonth: string
  setSelectedMonth: (month: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  )

  const refreshCategories = useCallback(async () => {
    const data = await categoriesApi.list()
    setCategories(data)
  }, [])

  useEffect(() => { refreshCategories() }, [refreshCategories])

  return (
    <AppContext.Provider value={{ categories, refreshCategories, selectedMonth, setSelectedMonth }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
