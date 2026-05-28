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
        <h1 className="text-2xl font-bold text-zinc-100">Token Usage</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Accumulated API usage since the server started — and a live token counter.
        </p>
      </div>

      {/* Usage table */}
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-300">Usage by feature</h2>
          <button onClick={load} className="text-xs text-indigo-400 hover:underline">Refresh</button>
        </div>

        {loadError && <p className="text-red-400 text-sm px-5 py-4">{loadError}</p>}

        {summary && (
          <table className="w-full text-left">
            <thead className="bg-zinc-800/60 border-b border-zinc-700">
              <tr>
                {['Feature', 'Calls', 'Input tokens', 'Output tokens', 'Cache writes', 'Cache reads', 'Est. cost', 'Savings'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {summary.features.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-sm text-zinc-500 text-center">
                    No API calls recorded yet — use Insights, Score, or Ask AI first.
                  </td>
                </tr>
              ) : (
                <>
                  {summary.features.map(f => (
                    <tr key={f.feature} className="hover:bg-zinc-700 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-zinc-100">
                        {FEATURE_LABELS[f.feature] ?? f.feature}
                      </td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">{fmt(f.calls)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">{fmt(f.input_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">{fmt(f.output_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">{fmt(f.cache_creation_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-400">{fmt(f.cache_read_tokens)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums font-medium text-zinc-100">{fmtCost(f.cost)}</td>
                      <td className="px-4 py-2.5 text-sm tabular-nums font-medium">
                        {f.cache_savings > 0
                          ? <span className="text-emerald-400">{fmtCost(f.cache_savings)}</span>
                          : <span className="text-zinc-500">—</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-800/60 font-semibold border-t-2 border-zinc-700">
                    <td className="px-4 py-2.5 text-sm text-zinc-100">Total</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">{fmt(summary.totals.calls)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">{fmt(summary.totals.input_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">{fmt(summary.totals.output_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">{fmt(summary.totals.cache_creation_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-300">{fmt(summary.totals.cache_read_tokens)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-indigo-400">{fmtCost(summary.totals.cost)}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">
                      {summary.totals.cache_savings > 0
                        ? <span className="text-emerald-400">{fmtCost(summary.totals.cache_savings)}</span>
                        : <span className="text-zinc-500">—</span>}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}

        {summary && (
          <p className="text-xs text-zinc-500 px-5 py-3 border-t border-zinc-700">
            Pricing: ${summary.pricing.input_per_million}/M input · ${summary.pricing.output_per_million}/M output · Cache reads: $0.30/M · Cache writes: $3.75/M (claude-sonnet-4-6)
          </p>
        )}
      </div>

      {/* Live token counter */}
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">Live token counter</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Uses <code>client.messages.countTokens()</code> — counts tokens without spending any credits.
            Updates 600ms after you stop typing.
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
          placeholder="Type a prompt here to see its token count and estimated cost…"
          className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        {counting && (
          <p className="text-xs text-zinc-500 animate-pulse">Counting…</p>
        )}
        {countError && (
          <p className="text-xs text-red-400">{countError}</p>
        )}
        {countResult && !counting && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wide">Tokens</span>
              <p className="text-2xl font-bold tabular-nums text-zinc-100">{fmt(countResult.input_tokens)}</p>
            </div>
            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wide">Estimated input cost</span>
              <p className="text-2xl font-bold tabular-nums text-indigo-400">{fmtCost(countResult.estimated_cost)}</p>
            </div>
            <div className="text-xs text-zinc-500 self-end pb-1">
              ~{Math.round(prompt.length / countResult.input_tokens * 10) / 10} chars/token
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
