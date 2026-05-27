import { apiClient } from './client'
import type { MonthlyScore } from './score'

export interface BatchCreated {
  batch_id: string
  request_count: number
  months: string[]
  processing_status: string
  created_at: string
  expires_at: string
}

export interface BatchStatus {
  batch_id: string
  processing_status: 'in_progress' | 'canceling' | 'ended'
  request_counts: {
    processing: number
    succeeded: number
    errored: number
    canceled: number
    expired: number
  }
  ended_at: string | null
}

export interface BatchResult {
  month: string
  score: MonthlyScore | null
  error?: string
}

export interface BatchResults {
  scores: BatchResult[]
}

export const batchApi = {
  create: () => apiClient.post<BatchCreated>('/batch', {}),
  status: (id: string) => apiClient.get<BatchStatus>(`/batch/${id}`),
  results: (id: string) => apiClient.get<BatchResults>(`/batch/${id}/results`),
}
