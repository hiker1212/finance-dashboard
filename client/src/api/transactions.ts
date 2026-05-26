import { apiClient } from './client'
import type { Transaction } from '../types'

export interface TransactionPayload {
  amount: number
  type: 'income' | 'expense'
  description: string
  category_id: number | null
  date: string
}

export const transactionsApi = {
  list: (month?: string) =>
    apiClient.get<Transaction[]>(month ? `/transactions?month=${month}` : '/transactions'),
  create: (data: TransactionPayload) =>
    apiClient.post<Transaction>('/transactions', data),
  update: (id: number, data: TransactionPayload) =>
    apiClient.put<Transaction>(`/transactions/${id}`, data),
  remove: (id: number) => apiClient.delete(`/transactions/${id}`),
}
