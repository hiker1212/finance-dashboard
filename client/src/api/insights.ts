import { apiClient } from './client'

export const insightsApi = {
  generate: (month: string) =>
    apiClient.post<{ insights: string }>('/insights', { month }),
}
