interface Props {
  categoryName: string
  categoryColor: string
  spent: number
  limit: number
  onEdit: () => void
  onRemove: () => void
}

export function BudgetCard({ categoryName, categoryColor, spent, limit, onEdit, onRemove }: Props) {
  const pct = Math.min((spent / limit) * 100, 100)
  const isOver = spent > limit
  const isNear = !isOver && pct >= 80

  const barColor = isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
          <span className="font-medium text-gray-900 text-sm">{categoryName}</span>
          {isOver && (
            <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
              Over budget
            </span>
          )}
          {isNear && !isOver && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              Near limit
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">Edit</button>
          <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span className={isOver ? 'text-red-500 font-semibold' : ''}>${spent.toFixed(2)} spent</span>
        <span>${limit.toFixed(2)} / month</span>
      </div>
    </div>
  )
}
