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
      <p className="text-zinc-500 text-center py-16 text-sm">
        No transactions yet — add one above.
      </p>
    )
  }

  return (
    <div className="divide-y divide-zinc-700">
      {transactions.map(t => (
        <div key={t.id} className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-100 text-sm truncate">{t.description}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.date}</p>
          </div>

          {t.category_name && (
            <CategoryBadge name={t.category_name} color={t.category_color ?? '#6366f1'} />
          )}

          <span
            className={`font-semibold tabular-nums text-sm shrink-0 ${
              t.type === 'income' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
          </span>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onEdit(t)}
              className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(t.id)}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
