import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { summaryApi } from '../api/summary'
import { transactionsApi } from '../api/transactions'
import { CategoryBadge } from '../components/CategoryBadge'
import { SpendingPieChart } from '../components/SpendingPieChart'
import { MonthlyTrendChart } from '../components/MonthlyTrendChart'
import type { TrendDataPoint } from '../components/MonthlyTrendChart'
import type { MonthlySummary, Transaction } from '../types'

function getPrev6Months(selectedMonth: string): string[] {
  const [year, mon] = selectedMonth.split('-').map(Number)
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    let m = mon - i
    let y = year
    while (m <= 0) { m += 12; y-- }
    months.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return months
}

export function Dashboard() {
  const { selectedMonth, setSelectedMonth } = useApp()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [recent, setRecent] = useState<Transaction[]>([])
  const [trend, setTrend] = useState<TrendDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const months = getPrev6Months(selectedMonth)
      const [s, txs, monthSummaries] = await Promise.all([
        summaryApi.get(selectedMonth),
        transactionsApi.list(selectedMonth),
        Promise.all(months.map(m => summaryApi.get(m))),
      ])
      setSummary(s)
      setRecent(txs.slice(0, 5))
      setTrend(months.map((month, i) => ({
        month,
        income: monthSummaries[i].total_income,
        expenses: monthSummaries[i].total_expenses,
      })))
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { load() }, [load])

  const net = (summary?.total_income ?? 0) - (summary?.total_expenses ?? 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <input
          type="month" value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Income', value: summary?.total_income ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Expenses', value: summary?.total_expenses ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Net savings', value: net, color: net >= 0 ? 'text-emerald-600' : 'text-red-500', bg: net >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-5 ${bg}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>${value.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SpendingPieChart data={summary?.by_category ?? []} />
            <MonthlyTrendChart data={trend} />
          </div>

          {/* Recent transactions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Recent transactions</h2>
              <Link to="/transactions" className="text-xs text-indigo-600 hover:underline">View all →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                No transactions this month.{' '}
                <Link to="/transactions" className="text-indigo-600 hover:underline">Add one</Link>
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400">{t.date}</p>
                    </div>
                    {t.category_name && (
                      <CategoryBadge name={t.category_name} color={t.category_color ?? '#6366f1'} />
                    )}
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
