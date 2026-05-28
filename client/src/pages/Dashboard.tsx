import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { summaryApi } from '../api/summary'
import { transactionsApi } from '../api/transactions'
import { insightsApi } from '../api/insights'
import { scoreApi } from '../api/score'
import type { MonthlyScore } from '../api/score'
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
  const [exporting, setExporting] = useState(false)
  const [insights, setInsights] = useState<string>('')
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string>('')
  const [score, setScore] = useState<MonthlyScore | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string>('')

  async function handleGenerateInsights() {
    setInsightsLoading(true)
    setInsightsError('')
    setInsights('')
    try {
      for await (const chunk of insightsApi.stream(selectedMonth)) {
        setInsights(prev => prev + chunk)
      }
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setInsightsLoading(false)
    }
  }

  async function handleScoreMonth() {
    setScoreLoading(true)
    setScoreError('')
    setScore(null)
    try {
      setScore(await scoreApi.generate(selectedMonth))
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Failed to generate score')
    } finally {
      setScoreLoading(false)
    }
  }

  async function handleExportPdf() {
    if (!summary) return
    setExporting(true)
    try {
      const { exportSummaryToPdf } = await import('../utils/exportPdf')
      await exportSummaryToPdf(summary, recent)
    } finally {
      setExporting(false)
    }
  }

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
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <div className="flex items-center gap-2">
          <input
            type="month" value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-zinc-700 border border-zinc-600 text-zinc-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleExportPdf}
            disabled={exporting || !summary}
            title="Export PDF report"
            className="px-3 py-1.5 text-sm font-medium border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            ⬇ PDF
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Income', value: summary?.total_income ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
              { label: 'Expenses', value: summary?.total_expenses ?? 0, color: 'text-red-400', bg: 'bg-red-950/40' },
              { label: 'Net savings', value: net, color: net >= 0 ? 'text-emerald-400' : 'text-red-400', bg: net >= 0 ? 'bg-emerald-950/40' : 'bg-red-950/40' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-5 ${bg}`}>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
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
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">Recent transactions</h2>
              <Link to="/transactions" className="text-xs text-indigo-400 hover:underline">View all →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">
                No transactions this month.{' '}
                <Link to="/transactions" className="text-indigo-400 hover:underline">Add one</Link>
              </p>
            ) : (
              <div className="divide-y divide-zinc-700">
                {recent.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{t.description}</p>
                      <p className="text-xs text-zinc-500">{t.date}</p>
                    </div>
                    {t.category_name && (
                      <CategoryBadge name={t.category_name} color={t.category_color ?? '#6366f1'} />
                    )}
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Score */}
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">Monthly Score</h2>
              <button
                onClick={handleScoreMonth}
                disabled={scoreLoading}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {scoreLoading ? 'Scoring…' : score ? 'Re-score' : 'Score this month'}
              </button>
            </div>

            {scoreError && <p className="text-red-400 text-sm">{scoreError}</p>}

            {scoreLoading && (
              <p className="text-zinc-500 text-sm animate-pulse">Evaluating your financial health…</p>
            )}

            {score && !scoreLoading && (() => {
              const gradeColors: Record<string, string> = {
                A: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
                B: 'bg-blue-900/50 text-blue-400 border-blue-700',
                C: 'bg-amber-900/50 text-amber-400 border-amber-700',
                D: 'bg-orange-900/50 text-orange-400 border-orange-700',
                F: 'bg-red-900/50 text-red-400 border-red-700',
              }
              const riskColors: Record<string, string> = {
                low: 'bg-emerald-950/40 text-emerald-400',
                medium: 'bg-amber-950/40 text-amber-400',
                high: 'bg-red-950/40 text-red-400',
              }
              return (
                <div className="space-y-4">
                  {/* Score header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold shrink-0 ${gradeColors[score.grade] ?? gradeColors.C}`}>
                      {score.grade}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-zinc-100 tabular-nums">{score.overall_score}/10</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColors[score.risk_level]}`}>
                          {score.risk_level} risk
                        </span>
                        <span className="text-xs text-zinc-500 tabular-nums">
                          {score.savings_rate >= 0 ? '+' : ''}{score.savings_rate.toFixed(1)}% savings rate
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 italic">"{score.verdict}"</p>
                    </div>
                  </div>

                  {/* Strengths & Warnings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Strengths</p>
                      <ul className="space-y-1.5">
                        {score.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-zinc-300">
                            <span className="text-emerald-500 shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Warnings</p>
                      <ul className="space-y-1.5">
                        {score.warnings.map((w, i) => (
                          <li key={i} className="flex gap-2 text-sm text-zinc-300">
                            <span className="text-amber-500 shrink-0">⚠</span>{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })()}

            {!score && !scoreLoading && !scoreError && (
              <p className="text-zinc-500 text-sm text-center py-4">
                Click "Score this month" to get a structured AI evaluation with grade, risk level, and specific feedback.
              </p>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300">AI Spending Insights</h2>
              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {insightsLoading ? 'Analyzing…' : insights ? 'Refresh' : 'Generate insights'}
              </button>
            </div>
            {insightsError && (
              <p className="text-red-400 text-sm">{insightsError}</p>
            )}
            {insightsLoading && (
              <p className="text-zinc-500 text-sm animate-pulse">Analyzing your spending data…</p>
            )}
            {!insightsLoading && !insightsError && insights && (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{insights}</p>
            )}
            {!insightsLoading && !insightsError && !insights && (
              <p className="text-zinc-500 text-sm text-center py-4">
                Click "Generate insights" to get AI-powered analysis of your spending this month.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
