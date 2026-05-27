import { useState, useCallback } from 'react'
import { analysisApi, type AnalysisResult } from '../api/analysis'

export function Analysis() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleAnalyse = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analysisApi.generate(3)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deep Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Powered by <span className="font-mono">claude-opus-4-7</span> with extended thinking — comprehensive multi-month financial review.
          </p>
        </div>
        {result && (
          <span className="ml-auto inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            {result.months_analyzed} {result.months_analyzed === 1 ? 'month' : 'months'} analysed
          </span>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Uses adaptive thinking — the model decides how much internal reasoning to spend. May take 15–30 seconds.
      </div>

      <div>
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Running…' : 'Analyse last 3 months'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4">
          <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-indigo-400" />
          <span className="text-sm text-gray-600">Thinking with <span className="font-mono">claude-opus-4-7</span>…</span>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {result.thinking && (
            <details className="rounded-lg border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
                Model's reasoning ({result.thinking.length.toLocaleString()} chars)
              </summary>
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
                  {result.thinking}
                </div>
              </div>
            </details>
          )}

          <div className="rounded-lg border border-gray-200 bg-white px-6 py-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Analysis</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-3">
              {result.analysis.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
