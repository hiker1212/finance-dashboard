import { apiClient } from './client'

export const insightsApi = {
  generate: (month: string) =>
    apiClient.post<{ insights: string }>('/insights', { month }),

  async *stream(month: string): AsyncGenerator<string> {
    const response = await fetch('/api/insights/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
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
          if (data === '[DONE]') return
          yield JSON.parse(data) as string
        }
      }
    }
  },
}
