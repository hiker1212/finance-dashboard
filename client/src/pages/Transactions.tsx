import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { transactionsApi } from '../api/transactions'
import { categoriesApi } from '../api/categories'
import { budgetsApi } from '../api/budgets'
import { summaryApi } from '../api/summary'
import { TransactionList } from '../components/TransactionList'
import { TransactionForm } from '../components/TransactionForm'
import { Modal } from '../components/Modal'
import type { Transaction, MonthlySummary } from '../types'

export function Transactions() {
  const { categories, selectedMonth, setSelectedMonth, refreshCategories } = useApp()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, s] = await Promise.all([
        transactionsApi.list(selectedMonth),
        summaryApi.get(selectedMonth),
      ])
      setTransactions(data)
      setSummary(s)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  async function handleExportExcel() {
    setExporting(true)
    try {
      const { exportTransactionsToExcel } = await import('../utils/exportExcel')
      await exportTransactionsToExcel(transactions, selectedMonth)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportPdf() {
    if (!summary) return
    setExporting(true)
    try {
      const { exportSummaryToPdf } = await import('../utils/exportPdf')
      await exportSummaryToPdf(summary, transactions)
    } finally {
      setExporting(false)
    }
  }

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

  async function handleCreateCategory(data: { name: string; color: string; monthlyLimit?: number }) {
    const cat = await categoriesApi.create({ name: data.name, color: data.color })
    if (data.monthlyLimit) {
      await budgetsApi.upsert(cat.id as number, data.monthlyLimit)
    }
    refreshCategories()
    return cat
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Transactions</h1>
        <div className="flex items-center gap-2">
          <input
            type="month" value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 dark:bg-zinc-600 dark:border-zinc-500 dark:text-zinc-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleExportExcel}
            disabled={exporting || transactions.length === 0}
            title="Export to Excel"
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40 rounded-lg transition-colors"
          >
            ⬇ Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting || !summary}
            title="Export PDF report"
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-40 rounded-lg transition-colors"
          >
            ⬇ PDF
          </button>
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
          { label: 'Income', value: total.income, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Expenses', value: total.expense, color: 'text-red-500 dark:text-red-400' },
          { label: 'Net', value: total.income - total.expense, color: total.income - total.expense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>
              ${value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl px-4 py-2">
        {loading ? (
          <p className="text-gray-400 dark:text-zinc-500 text-center py-12 text-sm">Loading…</p>
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
            onCreateCategory={handleCreateCategory}
          />
        </Modal>
      )}
    </div>
  )
}
