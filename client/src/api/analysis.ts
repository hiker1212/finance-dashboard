import { apiClient } from './client'

export interface AnalysisResult {
  thinking: string
  analysis: string
  months_analyzed: number
}

export const analysisApi = {
  generate: (months?: number) =>
    apiClient.post<AnalysisResult>('/analysis', { months: months ?? 3 }),
}
