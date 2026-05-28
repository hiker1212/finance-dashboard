import { useEffect, useState } from 'react'
import { analyticsApi } from '../api/analytics'
import { CategoryBadge } from '../components/CategoryBadge'
import type { CategoryAvgSpending } from '../types'

export function Analytics() {
  const [rows, setRows] = useState<CategoryAvgSpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    analyticsApi
      .monthlyCategoryAvg()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 dark:text-zinc-500 text-sm">Loading…</p>
  if (error) return <p className="text-red-500 dark:text-red-400 text-sm">Error: {error}</p>

  const total = rows.reduce((sum, r) => sum + r.avg_monthly_spending, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6">Analytics</h1>

      <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-600">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
            Average Monthly Spending by Category
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Averaged over all months that have expense transactions per category
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-700/50 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 text-right">Avg / Month</th>
              <th className="px-6 py-3 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-600">
            {rows.map((row) => {
              const pct = total > 0 ? (row.avg_monthly_spending / total) * 100 : 0
              return (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-zinc-600/30 transition-colors">
                  <td className="px-6 py-3">
                    <CategoryBadge name={row.name} color={row.color} />
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-zinc-100">
                    {row.avg_monthly_spending > 0
                      ? `$${row.avg_monthly_spending.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500 dark:text-zinc-400">
                    {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-700/50 font-semibold text-gray-700 dark:text-zinc-300">
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-right">${total.toFixed(2)}</td>
                <td className="px-6 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          )}
        </table>

        {rows.every((r) => r.avg_monthly_spending === 0) && (
          <p className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500 text-sm">
            No expense transactions yet.
          </p>
        )}
      </div>
    </div>
  )
}
