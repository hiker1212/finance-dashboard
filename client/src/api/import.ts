import { apiClient } from './client'

export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

export interface PreviewResult {
  file_id: string
  transactions: ExtractedTransaction[]
  notes: string
}

export const importApi = {
  preview: (csv: string, month: string) =>
    apiClient.post<PreviewResult>('/import/preview', { csv, month }),
}
