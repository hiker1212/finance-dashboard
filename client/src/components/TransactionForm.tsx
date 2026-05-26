import { useState } from 'react'
import type { Transaction, Category } from '../types'
import type { TransactionPayload } from '../api/transactions'

interface Props {
  categories: Category[]
  initial?: Transaction | null
  onSubmit: (data: TransactionPayload) => Promise<void>
  onCancel: () => void
}

export function TransactionForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial?.amount.toString() ?? '')
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category_id?.toString() ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Amount must be a positive number')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        amount: parsed,
        type,
        description,
        category_id: categoryId ? Number(categoryId) : null,
        date,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tx-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            id="tx-amount" type="number" step="0.01" min="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            className={inputCls} required
          />
        </div>
        <div>
          <label htmlFor="tx-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select id="tx-type" value={type} onChange={e => setType(e.target.value as 'income' | 'expense')} className={inputCls}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tx-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          id="tx-description" type="text" value={description} onChange={e => setDescription(e.target.value)}
          className={inputCls} required placeholder="e.g. Grocery run"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tx-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select id="tx-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">Uncategorized</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tx-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            id="tx-date" type="date" value={date} onChange={e => setDate(e.target.value)}
            className={inputCls} required
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
        <button
          type="submit" disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : initial ? 'Update' : 'Add Transaction'}
        </button>
      </div>
    </form>
  )
}
