import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { chatApi } from '../api/chat'
import type { ChatToolCall } from '../api/chat'

const EXAMPLES = [
  'How much did I spend last month?',
  'Which category am I closest to going over budget?',
  'What were my top 3 expenses this month?',
  'Compare this month to last month',
]

const TOOL_LABELS: Record<string, string> = {
  get_monthly_summary: 'Monthly summary',
  get_transactions: 'Transactions',
  get_budget_status: 'Budget status',
  compare_months: 'Month comparison',
}

interface Props {
  toolCall: ChatToolCall
}

function ToolCallBadge({ toolCall }: Props) {
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name
  const detail = Object.entries(toolCall.input)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800 rounded-full px-2.5 py-1">
      <span className="font-medium">{label}</span>
      {detail && <span className="text-indigo-400 dark:text-indigo-500">({detail})</span>}
    </span>
  )
}

export function Chat() {
  const { selectedMonth } = useApp()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [toolCalls, setToolCalls] = useState<ChatToolCall[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAsk(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setAnswer('')
    setToolCalls([])
    setQuestion(q)
    try {
      const result = await chatApi.ask(q, selectedMonth)
      setAnswer(result.answer)
      setToolCalls(result.toolCalls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Ask your finances</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Claude queries your data autonomously to answer questions.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk(question)}
          placeholder="e.g. Which category am I overspending on?"
          className="flex-1 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 dark:bg-zinc-600 dark:border-zinc-500 dark:text-zinc-100 dark:placeholder-zinc-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => handleAsk(question)}
          disabled={loading || !question.trim()}
          className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      {/* Example questions */}
      {!answer && !loading && (
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => handleAsk(ex)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-5">
          <p className="text-sm text-gray-400 dark:text-zinc-500 animate-pulse">Querying your finances…</p>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

      {/* Answer */}
      {answer && !loading && (
        <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-5 space-y-4">
          {toolCalls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                Tools used ({toolCalls.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {toolCalls.map((tc, i) => (
                  <ToolCallBadge key={i} toolCall={tc} />
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  )
}
