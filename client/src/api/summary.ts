import { apiClient } from './client'
import type { MonthlySummary } from '../types'

export const summaryApi = {
  get: (month: string) =>
    apiClient.get<MonthlySummary>(`/summary?month=${month}`),
}
