import type { ReceiptExtraction } from '../types'

const BASE = '/api'

export const receiptApi = {
  analyze: async (file: File): Promise<ReceiptExtraction> => {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE}/receipt`, { method: 'POST', body: form })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error((body as { error: string }).error || 'Receipt analysis failed')
    }
    return res.json() as Promise<ReceiptExtraction>
  },
}
