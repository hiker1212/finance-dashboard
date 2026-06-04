import { apiClient } from './client'

export interface AnalysisResult {
  thinking: string
  analysis: string
  months_analyzed: number
}

export interface AnalysisStreamEvent {
  type: 'thinking' | 'text' | 'done'
  chunk: string
  months_analyzed?: number
}

export const analysisApi = {
  generate: (months?: number) =>
    apiClient.post<AnalysisResult>('/analysis', { months: months ?? 3 }),

  async *stream(months?: number): AsyncGenerator<AnalysisStreamEvent> {
    const response = await fetch('/api/analysis/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ months: months ?? 3 }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`)
    }
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const messages = buffer.split('\n\n')
      buffer = messages.pop() ?? ''

      for (const message of messages) {
        if (message.startsWith('event: error')) {
          const dataLine = message.split('\n').find(l => l.startsWith('data: '))
          throw new Error(dataLine ? JSON.parse(dataLine.slice(6)) : 'Stream error')
        }
        if (message.startsWith('data: ')) {
          const data = message.slice(6)
          yield JSON.parse(data) as AnalysisStreamEvent
        }
      }
    }
  },
}
