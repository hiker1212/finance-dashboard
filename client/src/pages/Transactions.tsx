import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { transactionsApi } from '../api/transactions'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { Modal } from '../components/Modal'
import type { Transaction } from '../types'

export function Transactions() {
  const { categories, selectedMonth, setSelectedMonth } = useApp()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await transactionsApi.list(selectedMonth)
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Parameters<typeof transactionsApi.create>[0]) {
    if (editing) {
      await transactionsApi.update(editing.id, data)
    } else {
      await transactionsApi.create(data)
    }
    setEditing(undefined)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this transaction?')) return
    await transactionsApi.remove(id)
    load()
  }

  const total = transactions.reduce(
    (acc, t) => ({ ...acc, [t.type]: acc[t.type] + t.amount }),
    { income: 0, expense: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-3">
          <input
            type="month" value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setEditing(null)}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Income', value: total.income, color: 'text-emerald-600' },
          { label: 'Expenses', value: total.expense, color: 'text-red-500' },
          { label: 'Net', value: total.income - total.expense, color: total.income - total.expense >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>
              ${value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-2">
        {loading ? (
          <p className="text-gray-400 text-center py-12 text-sm">Loading…</p>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={t => setEditing(t)}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal */}
      {editing !== undefined && (
        <Modal
          title={editing ? 'Edit Transaction' : 'New Transaction'}
          onClose={() => setEditing(undefined)}
        >
          <TransactionForm
            categories={categories}
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(undefined)}
          />
        </Modal>
      )}
    </div>
  )
}
