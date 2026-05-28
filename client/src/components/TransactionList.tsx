import type { Transaction } from '../types'
import { CategoryBadge } from './CategoryBadge'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="text-gray-400 dark:text-zinc-500 text-center py-16 text-sm">
        No transactions yet — add one above.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-zinc-600">
      {transactions.map(t => (
        <div key={t.id} className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-zinc-100 text-sm truncate">{t.description}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t.date}</p>
          </div>

          {t.category_name && (
            <CategoryBadge name={t.category_name} color={t.category_color ?? '#6366f1'} />
          )}

          <span
            className={`font-semibold tabular-nums text-sm shrink-0 ${
              t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
            }`}
          >
            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
          </span>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onEdit(t)}
              className="text-xs text-gray-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="text-xs text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
