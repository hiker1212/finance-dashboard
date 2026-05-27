import { apiClient } from './client'

export interface MonthlyScore {
  overall_score: number
  grade: string
  savings_rate: number
  risk_level: 'low' | 'medium' | 'high'
  strengths: string[]
  warnings: string[]
  verdict: string
}

export const scoreApi = {
  generate: (month: string) =>
    apiClient.post<MonthlyScore>('/score', { month }),
}
