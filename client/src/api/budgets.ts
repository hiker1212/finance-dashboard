import { apiClient } from './client'
import type { Budget } from '../types'

export const budgetsApi = {
  list: () => apiClient.get<Budget[]>('/budgets'),
  upsert: (categoryId: number, monthly_limit: number) =>
    apiClient.put<Budget>(`/budgets/${categoryId}`, { monthly_limit }),
  remove: (categoryId: number) => apiClient.delete(`/budgets/${categoryId}`),
}
