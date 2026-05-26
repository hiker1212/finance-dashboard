export interface Category {
  id: number
  name: string
  color: string
  created_at: string
}

export interface Transaction {
  id: number
  amount: number
  type: 'income' | 'expense'
  description: string
  category_id: number | null
  date: string
  created_at: string
  category_name?: string
  category_color?: string
}

export interface Budget {
  id: number
  category_id: number
  monthly_limit: number
  category_name?: string
  category_color?: string
}

export interface MonthlySummary {
  month: string
  total_income: number
  total_expenses: number
  transaction_count: number
  by_category: CategorySummary[]
}

export interface CategorySummary {
  id: number
  name: string
  color: string
  spent: number
  monthly_limit: number | null
}
