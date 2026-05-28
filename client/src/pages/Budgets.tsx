import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { budgetsApi } from '../api/budgets'
import { summaryApi } from '../api/summary'
import { categoriesApi } from '../api/categories'
import { BudgetCard } from '../components/BudgetCard'
import { Modal } from '../components/Modal'
import type { Budget, CategorySummary } from '../types'

export function Budgets() {
  const { categories, refreshCategories, selectedMonth } = useApp()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Map<number, number>>(new Map())
  const [editingBudget, setEditingBudget] = useState<{ categoryId: number; name: string; current?: number } | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [b, summary] = await Promise.all([
      budgetsApi.list(),
      summaryApi.get(selectedMonth),
    ])
    setBudgets(b)
    setSpending(new Map(summary.by_category.map((c: CategorySummary) => [c.id, c.spent])))
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBudget) return
    setSaving(true)
    try {
      await budgetsApi.upsert(editingBudget.categoryId, parseFloat(limitInput))
      setEditingBudget(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveBudget(categoryId: number) {
    if (!confirm('Remove this budget?')) return
    await budgetsApi.remove(categoryId)
    load()
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    setSaving(true)
    try {
      await categoriesApi.create({ name: newCatName.trim(), color: newCatColor })
      setNewCatName('')
      setNewCatColor('#6366f1')
      refreshCategories()
    } finally {
      setSaving(false)
    }
  }

  const budgetedIds = new Set(budgets.map(b => b.category_id))
  const unbudgeted = categories.filter(c => !budgetedIds.has(c.id))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-100">Budgets</h1>

      {/* Active budgets */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map(b => (
            <BudgetCard
              key={b.id}
              categoryName={b.category_name}
              categoryColor={b.category_color}
              spent={spending.get(b.category_id) ?? 0}
              limit={b.monthly_limit}
              onEdit={() => {
                setEditingBudget({ categoryId: b.category_id, name: b.category_name, current: b.monthly_limit })
                setLimitInput(b.monthly_limit.toString())
              }}
              onRemove={() => handleRemoveBudget(b.category_id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No budgets set yet.</p>
      )}

      {/* Set budget for unbudgeted categories */}
      {unbudgeted.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Set a budget for…</h2>
          <div className="flex flex-wrap gap-2">
            {unbudgeted.map(c => (
              <button
                key={c.id}
                onClick={() => { setEditingBudget({ categoryId: c.id, name: c.name }); setLimitInput('') }}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-600 text-zinc-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors"
                style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add category */}
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Add category</h2>
        <form onSubmit={handleAddCategory} className="flex gap-3 items-end">
          <div className="flex-1">
            <input
              type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Category name" required
              className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <input
            type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
            className="h-9 w-12 rounded-lg border border-zinc-600 cursor-pointer bg-zinc-700"
          />
          <button
            type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      {/* Set/edit budget modal */}
      {editingBudget && (
        <Modal title={`Budget for ${editingBudget.name}`} onClose={() => setEditingBudget(null)}>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div>
              <label htmlFor="budget-limit" className="block text-sm font-medium text-zinc-300 mb-1">Monthly limit ($)</label>
              <input
                id="budget-limit" type="number" step="0.01" min="0.01"
                value={limitInput} onChange={e => setLimitInput(e.target.value)}
                className="w-full bg-zinc-700 border border-zinc-600 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setEditingBudget(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
