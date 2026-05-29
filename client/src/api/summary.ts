import { apiClient } from './client'
import type { MonthlySummary, RangeSummary } from '../types'

export const summaryApi = {
  get: (month: string) =>
    apiClient.get<MonthlySummary>(`/summary?month=${month}`),
  getRange: (from: string, to: string) =>
    apiClient.get<RangeSummary>(`/summary/range?from=${from}&to=${to}`),
}
