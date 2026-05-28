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

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>
  if (error) return <p className="text-red-400 text-sm">Error: {error}</p>

  const total = rows.reduce((sum, r) => sum + r.avg_monthly_spending, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Analytics</h1>

      <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-300">
            Average Monthly Spending by Category
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Averaged over all months that have expense transactions per category
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/50 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 text-right">Avg / Month</th>
              <th className="px-6 py-3 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {rows.map((row) => {
              const pct = total > 0 ? (row.avg_monthly_spending / total) * 100 : 0
              return (
                <tr key={row.id} className="hover:bg-zinc-700/30 transition-colors">
                  <td className="px-6 py-3">
                    <CategoryBadge name={row.name} color={row.color} />
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-zinc-100">
                    {row.avg_monthly_spending > 0
                      ? `$${row.avg_monthly_spending.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-right text-zinc-500">
                    {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-800/50 font-semibold text-zinc-300">
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-right">${total.toFixed(2)}</td>
                <td className="px-6 py-3 text-right">100%</td>
              </tr>
            </tfoot>
          )}
        </table>

        {rows.every((r) => r.avg_monthly_spending === 0) && (
          <p className="px-6 py-8 text-center text-zinc-500 text-sm">
            No expense transactions yet.
          </p>
        )}
      </div>
    </div>
  )
}
