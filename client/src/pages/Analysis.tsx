import { useState, useCallback } from 'react'
import { analysisApi } from '../api/analysis'

export function Analysis() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thinkingText, setThinkingText] = useState('')
  const [analysisText, setAnalysisText] = useState('')
  const [monthsAnalyzed, setMonthsAnalyzed] = useState<number | null>(null)
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'writing' | 'done'>('idle')
  const [thinkingOpen, setThinkingOpen] = useState(true)

  const handleAnalyse = useCallback(async () => {
    setLoading(true)
    setError(null)
    setThinkingText('')
    setAnalysisText('')
    setMonthsAnalyzed(null)
    setPhase('thinking')
    setThinkingOpen(true)

    try {
      for await (const event of analysisApi.stream(3)) {
        if (event.type === 'thinking') {
          setPhase('thinking')
          setThinkingText(prev => prev + event.chunk)
        } else if (event.type === 'text') {
          setPhase('writing')
          setAnalysisText(prev => prev + event.chunk)
        } else if (event.type === 'done') {
          setMonthsAnalyzed(event.months_analyzed ?? null)
          setPhase('done')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
      setPhase('done')
    } finally {
      setLoading(false)
    }
  }, [])

  const hasContent = thinkingText || analysisText

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Deep Analysis</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Powered by <span className="font-mono">claude-opus-4-8</span> with streaming extended thinking — reasoning unfolds live.
          </p>
        </div>
        {monthsAnalyzed !== null && (
          <span className="ml-auto inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-700 px-3 py-1 text-xs font-medium">
            {monthsAnalyzed} {monthsAnalyzed === 1 ? 'month' : 'months'} analysed
          </span>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-4 py-3 text-sm">
        Uses streaming extended thinking — the model's reasoning unfolds live in the panel below, then the analysis streams in. May take 15–30 seconds.
      </div>

      <div>
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? (phase === 'thinking' ? 'Thinking…' : 'Writing…')
            : 'Analyse last 3 months'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {loading && !hasContent && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white dark:border-zinc-600 dark:bg-zinc-700 px-4 py-4">
          <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-indigo-400" />
          <span className="text-sm text-gray-500 dark:text-zinc-400">
            Starting analysis with <span className="font-mono">claude-opus-4-8</span>…
          </span>
        </div>
      )}

      {hasContent && (
        <div className="space-y-4">
          {thinkingText && (
            <details
              open={thinkingOpen}
              onToggle={(e) => setThinkingOpen((e.target as HTMLDetailsElement).open)}
              className="rounded-lg border border-gray-200 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-700/50"
            >
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-2">
                <span>Model's reasoning</span>
                {loading && phase === 'thinking'
                  ? <span className="text-indigo-500 dark:text-indigo-400 animate-pulse text-xs font-normal">streaming…</span>
                  : <span className="text-gray-400 dark:text-zinc-500 text-xs font-normal">({thinkingText.length.toLocaleString()} chars)</span>
                }
              </summary>
              <div className="border-t border-gray-200 dark:border-zinc-600 px-4 py-3">
                <div className="font-mono text-xs text-gray-500 dark:text-zinc-500 whitespace-pre-wrap">
                  {thinkingText}
                  {loading && phase === 'thinking' && (
                    <span className="animate-pulse text-indigo-400">▌</span>
                  )}
                </div>
              </div>
            </details>
          )}

          {analysisText && (
            <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-600 dark:bg-zinc-700 px-6 py-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                Analysis
                {loading && phase === 'writing' && (
                  <span className="text-xs font-normal text-indigo-500 dark:text-indigo-400 animate-pulse">streaming…</span>
                )}
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-zinc-300 leading-relaxed space-y-3">
                {analysisText.split('\n\n').map((para, i, arr) => (
                  <p key={i}>
                    {para}
                    {loading && phase === 'writing' && i === arr.length - 1 && (
                      <span className="animate-pulse text-indigo-400">▌</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
