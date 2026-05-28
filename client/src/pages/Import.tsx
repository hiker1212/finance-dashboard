import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { importApi } from '../api/import'
import { transactionsApi } from '../api/transactions'
import type { ExtractedTransaction, PreviewResult } from '../api/import'

const SAMPLE_CSV = `Date,Description,Amount,Type
2026-05-01,Monthly Salary,3200.00,credit
2026-05-03,Freelance Invoice,750.00,credit
2026-05-05,Supermarket Weekly Shop,87.50,debit
2026-05-07,Netflix,15.00,debit
2026-05-10,Electricity Bill,92.00,debit
2026-05-12,Uber Ride,24.00,debit
2026-05-14,Gym Membership,40.00,debit
2026-05-16,Restaurant Dinner,48.00,debit
2026-05-18,Internet Bill,45.00,debit
2026-05-20,Coffee Shop,13.50,debit
2026-05-22,Pharmacy,35.00,debit
2026-05-25,Cinema Tickets,28.00,debit`.trim()

const TYPE_STYLES: Record<string, string> = {
  income: 'text-emerald-400',
  expense: 'text-red-400',
}

interface RowProps {
  tx: ExtractedTransaction
  selected: boolean
  onToggle: () => void
}

function TransactionRow({ tx, selected, onToggle }: RowProps) {
  return (
    <tr className={selected ? 'bg-zinc-800' : 'bg-zinc-800/40 opacity-50'}>
      <td className="px-3 py-2">
        <input type="checkbox" checked={selected} onChange={onToggle} className="rounded" />
      </td>
      <td className="px-3 py-2 text-xs text-zinc-500 tabular-nums">{tx.date}</td>
      <td className="px-3 py-2 text-sm text-zinc-100">{tx.description}</td>
      <td className="px-3 py-2 text-xs text-zinc-500">{tx.category}</td>
      <td className={`px-3 py-2 text-sm font-medium tabular-nums text-right ${TYPE_STYLES[tx.type]}`}>
        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
      </td>
    </tr>
  )
}

export function Import() {
  const { selectedMonth } = useApp()
  const [csv, setCsv] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  async function handleExtract() {
    setExtracting(true)
    setExtractError(null)
    setPreview(null)
    setImportedCount(0)
    try {
      const result = await importApi.preview(csv, selectedMonth)
      setPreview(result)
      setSelected(new Set(result.transactions.map((_, i) => i)))
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  function toggleAll() {
    if (!preview) return
    if (selected.size === preview.transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(preview.transactions.map((_, i) => i)))
    }
  }

  async function handleImport() {
    if (!preview) return
    setImporting(true)
    let count = 0
    try {
      const toImport = preview.transactions.filter((_, i) => selected.has(i))
      await Promise.all(toImport.map(tx =>
        transactionsApi.create({
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          category_id: null,
        }).then(() => { count++ })
      ))
      setImportedCount(count)
      setPreview(null)
      setCsv('')
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Import Statement</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Paste a CSV bank statement — Claude reads it via the Files API and extracts transactions.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl p-4 text-xs text-indigo-300 space-y-1">
        <p className="font-medium text-sm">What the Files API adds</p>
        <ol className="list-decimal list-inside space-y-0.5 text-indigo-400">
          <li>CSV uploaded once to Anthropic → stored as a file, returned a <code>file_id</code></li>
          <li>Message references <code>{`{ type: 'document', source: { type: 'file', file_id } }`}</code></li>
          <li>Same <code>file_id</code> can be reused in future messages with no re-upload</li>
          <li>File deleted after extraction (lifecycle managed by your code)</li>
        </ol>
      </div>

      {/* CSV input */}
      {!preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">CSV content</label>
            <button
              onClick={() => setCsv(SAMPLE_CSV)}
              className="text-xs text-indigo-400 hover:underline"
            >
              Use sample statement
            </button>
          </div>
          <textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            rows={10}
            placeholder="Date,Description,Amount,Type&#10;2026-05-01,Salary,3200.00,credit&#10;…"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={handleExtract}
            disabled={extracting || !csv.trim()}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {extracting ? 'Extracting…' : 'Extract transactions'}
          </button>
        </div>
      )}

      {extractError && <p className="text-red-400 text-sm">{extractError}</p>}

      {extracting && (
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
          <p className="text-sm text-zinc-500 animate-pulse">Uploading to Files API and extracting…</p>
        </div>
      )}

      {/* Import success */}
      {importedCount > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-4">
          <p className="text-sm font-medium text-emerald-400">
            ✓ {importedCount} transactions imported — check the Transactions page.
          </p>
        </div>
      )}

      {/* Preview table */}
      {preview && !importing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-300">
                {preview.transactions.length} transactions extracted
              </p>
              {preview.notes && (
                <p className="text-xs text-zinc-500 mt-0.5 italic">{preview.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setCsv('') }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Import {selected.size} selected
              </button>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/60 border-b border-zinc-700">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.size === preview.transactions.length}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Category</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {preview.transactions.map((tx, i) => (
                  <TransactionRow
                    key={i}
                    tx={tx}
                    selected={selected.has(i)}
                    onToggle={() => setSelected(prev => {
                      const next = new Set(prev)
                      next.has(i) ? next.delete(i) : next.add(i)
                      return next
                    })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
