import { apiClient } from './client'
import type { CategoryAvgSpending } from '../types'

export const analyticsApi = {
  monthlyCategoryAvg: () =>
    apiClient.get<CategoryAvgSpending[]>('/analytics/monthly-by-category'),
}
