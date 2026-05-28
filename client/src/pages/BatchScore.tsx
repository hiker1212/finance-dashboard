import { useState, useEffect, useRef } from 'react'
import { batchApi } from '../api/batch'
import type { BatchCreated, BatchStatus, BatchResult } from '../api/batch'
import type { MonthlyScore } from '../api/score'

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  B: 'bg-blue-900/50 text-blue-400 border-blue-700',
  C: 'bg-amber-900/50 text-amber-400 border-amber-700',
  D: 'bg-orange-900/50 text-orange-400 border-orange-700',
  F: 'bg-red-900/50 text-red-400 border-red-700',
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
}

interface ScoreCardProps {
  result: BatchResult
}

function ScoreCard({ result }: ScoreCardProps) {
  const score = result.score as MonthlyScore | null
  if (result.error || !score) {
    return (
      <div className="bg-zinc-800 rounded-xl border border-red-900 p-4">
        <p className="text-sm font-semibold text-zinc-300 mb-1">{result.month}</p>
        <p className="text-xs text-red-400">{result.error ?? 'No data'}</p>
      </div>
    )
  }
  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold shrink-0 ${GRADE_COLORS[score.grade] ?? GRADE_COLORS.C}`}>
          {score.grade}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{result.month}</p>
          <p className="text-xs text-zinc-500 tabular-nums">
            {score.overall_score}/10 · <span className={RISK_COLORS[score.risk_level]}>{score.risk_level} risk</span> · {score.savings_rate >= 0 ? '+' : ''}{score.savings_rate.toFixed(1)}% saved
          </p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 italic leading-relaxed">"{score.verdict}"</p>
      <div className="space-y-1">
        {score.strengths.map((s, i) => (
          <p key={i} className="text-xs text-zinc-400 flex gap-1.5">
            <span className="text-emerald-400 shrink-0">✓</span>{s}
          </p>
        ))}
        {score.warnings.map((w, i) => (
          <p key={i} className="text-xs text-zinc-400 flex gap-1.5">
            <span className="text-amber-400 shrink-0">⚠</span>{w}
          </p>
        ))}
      </div>
    </div>
  )
}

export function BatchScore() {
  const [batch, setBatch] = useState<BatchCreated | null>(null)
  const [status, setStatus] = useState<BatchStatus | null>(null)
  const [results, setResults] = useState<BatchResult[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => () => stopPolling(), [])

  async function pollStatus(batchId: string) {
    try {
      const s = await batchApi.status(batchId)
      setStatus(s)
      if (s.processing_status === 'ended') {
        stopPolling()
        const r = await batchApi.results(batchId)
        setResults(r.scores)
      }
    } catch {
      // silently retry on poll errors
    }
  }

  async function handleCreate() {
    setCreating(true)
    setError(null)
    setBatch(null)
    setStatus(null)
    setResults(null)
    stopPolling()
    try {
      const b = await batchApi.create()
      setBatch(b)
      pollRef.current = setInterval(() => pollStatus(b.batch_id), 5000)
      pollStatus(b.batch_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch')
    } finally {
      setCreating(false)
    }
  }

  const total = status ? Object.values(status.request_counts).reduce((a, b) => a + b, 0) : 0
  const done = status ? status.request_counts.succeeded + status.request_counts.errored + status.request_counts.canceled + status.request_counts.expired : 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Batch Score</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Score every month at once using the Batch API — 50% cheaper, processed asynchronously.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl p-4 text-sm text-indigo-300 space-y-1">
        <p className="font-medium">How batch differs from single requests</p>
        <ul className="text-xs space-y-0.5 text-indigo-400 list-disc list-inside">
          <li>All months submitted in one API call — one <code>batch_id</code> covers them all</li>
          <li>50% cost reduction vs standard API</li>
          <li>Processing is async — results arrive in minutes, not seconds</li>
          <li>Results retrieved separately once <code>processing_status === "ended"</code></li>
        </ul>
      </div>

      <button
        onClick={handleCreate}
        disabled={creating || (!!batch && status?.processing_status !== 'ended')}
        className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {creating ? 'Submitting…' : batch && status?.processing_status !== 'ended' ? 'Batch in progress…' : 'Score all months'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Batch metadata */}
      {batch && (
        <div className="bg-zinc-800/60 rounded-xl border border-zinc-700 p-4 font-mono text-xs space-y-1 text-zinc-400">
          <p><span className="text-zinc-500">batch_id</span>         {batch.batch_id}</p>
          <p><span className="text-zinc-500">request_count</span>    {batch.request_count} ({batch.months.join(', ')})</p>
          <p><span className="text-zinc-500">created_at</span>       {batch.created_at}</p>
          <p><span className="text-zinc-500">expires_at</span>       {batch.expires_at}</p>
          {status && (
            <>
              <p><span className="text-zinc-500">processing_status</span> {status.processing_status}</p>
              <p><span className="text-zinc-500">progress</span>          {done}/{total} requests complete</p>
            </>
          )}
        </div>
      )}

      {/* Progress */}
      {status && status.processing_status !== 'ended' && (
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Processing {batch?.request_count} requests… ({done}/{total} done)</p>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Polling every 5 seconds. Batch API typically completes in 1–5 minutes.</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-300">
            Results — {results.length} months scored
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(r => <ScoreCard key={r.month} result={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
