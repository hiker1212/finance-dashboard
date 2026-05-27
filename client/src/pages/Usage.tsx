import { useState, useEffect, useCallback } from 'react'
import { usageApi } from '../api/usage'
import type { UsageSummary, TokenCount } from '../api/usage'

const FEATURE_LABELS: Record<string, string> = {
  insights: 'Insights (non-stream)',
  insights_stream: 'Insights (stream)',
  chat: 'Ask AI (per loop turn)',
  score: 'Monthly Score',
  import: 'Statement Import',
}

function fmt(n: number) { return n.toLocaleString() }
function fmtCost(n: number) {
  if (n < 0.001) return `$${(n * 100).toFixed(4)}¢`
  return `$${n.toFixed(4)}`
}

export function Usage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('')
  const [counting, setCounting] = useState(false)
  const [countResult, setCountResult] = useState<TokenCount | null>(null)
  const [countError, setCountError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setSummary(await usageApi.get())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load usage')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Debounced count-as-you-type
  useEffect(() => {
    if (!prompt.trim()) { setCountResult(null); return }
    const timer = setTimeout(async () => {
      setCounting(true)
      setCountError(null)
      try {
        setCountResult(await usageApi.count(prompt))
      } catch (err) {
        setCountError(err instanceof Error ? err.message : 'Count failed')
      } finally {
        setCounting(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [prompt])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Token Usage</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accumulated API usage since the server started — and a live token counter.
        </p>
      </div>

      {/* Usage table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Usage by feature</h2>
          <button onClick={load} className="text-xs text-indigo-600 hover:underline">Refresh</button>
        </div>

        {loadError && <p className="text-red-500 text-sm px-5 py-4">{loadError}</p>}

        {summary && (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Feature', 'Calls', 'Input tokens', 'Output tokens', 'Est. cost'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.features.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-sm text-gray-400 text-center">
                    No API calls recorded yet — use Insights, Score, or Ask AI first.
                  </td>
                </tr>
              ) : (
                <>
                  {summary.features.map(f => (
                    <tr key={f.feature} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-gray-900">
                        {FEATURE_LABELS[f.feature] ?? f.feature}
                      </td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-gray-600">{fmt(f.calls)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-gray-600">{fmt(f.input_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-gray-600">{fmt(f.output_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums font-medium text-gray-900">{fmtCost(f.cost)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <td className="px-4 py-2.5 text-sm text-gray-900">Total</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">{fmt(summary.totals.calls)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">{fmt(summary.totals.input_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">{fmt(summary.totals.output_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-indigo-700">{fmtCost(summary.totals.cost)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}

        {summary && (
          <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100">
            Pricing: ${summary.pricing.input_per_million}/M input · ${summary.pricing.output_per_million}/M output (claude-sonnet-4-6)
          </p>
        )}
      </div>

      {/* Live token counter */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Live token counter</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Uses <code>client.messages.countTokens()</code> — counts tokens without spending any credits.
            Updates 600ms after you stop typing.
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
          placeholder="Type a prompt here to see its token count and estimated cost…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        {counting && (
          <p className="text-xs text-gray-400 animate-pulse">Counting…</p>
        )}
        {countError && (
          <p className="text-xs text-red-500">{countError}</p>
        )}
        {countResult && !counting && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Tokens</span>
              <p className="text-2xl font-bold tabular-nums text-gray-900">{fmt(countResult.input_tokens)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Estimated input cost</span>
              <p className="text-2xl font-bold tabular-nums text-indigo-700">{fmtCost(countResult.estimated_cost)}</p>
            </div>
            <div className="text-xs text-gray-400 self-end pb-1">
              ~{Math.round(prompt.length / countResult.input_tokens * 10) / 10} chars/token
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
