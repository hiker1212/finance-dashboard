import { apiClient } from './client'

export interface FeatureCost {
  feature: string
  calls: number
  input_tokens: number
  output_tokens: number
  cost: number
}

export interface UsageSummary {
  features: FeatureCost[]
  totals: { calls: number; input_tokens: number; output_tokens: number; cost: number }
  pricing: { input_per_million: number; output_per_million: number }
}

export interface TokenCount {
  input_tokens: number
  estimated_cost: number
}

export const usageApi = {
  get: () => apiClient.get<UsageSummary>('/usage'),
  count: (prompt: string) => apiClient.post<TokenCount>('/usage/count', { prompt }),
}
