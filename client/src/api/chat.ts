import { apiClient } from './client'

export interface ChatToolCall {
  name: string
  input: Record<string, unknown>
}

export interface ChatResponse {
  answer: string
  toolCalls: ChatToolCall[]
}

export const chatApi = {
  ask: (question: string, month: string) =>
    apiClient.post<ChatResponse>('/chat', { question, month }),
}
