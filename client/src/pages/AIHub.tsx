import { useState } from 'react'
import { Chat } from './Chat'
import { BatchScore } from './BatchScore'
import { Import } from './Import'
import { Usage } from './Usage'
import { Analysis } from './Analysis'

type Tab = 'chat' | 'batch' | 'import' | 'usage' | 'analysis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Ask AI' },
  { id: 'batch', label: 'Batch Score' },
  { id: 'import', label: 'Import' },
  { id: 'usage', label: 'Usage' },
  { id: 'analysis', label: 'Analysis' },
]

const activeCls = 'bg-indigo-600 text-white font-medium'
const inactiveCls =
  'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700'

export function AIHub() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">AI Features</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Claude-powered tools for your finances.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-700 rounded-lg mb-6 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === id ? activeCls : inactiveCls
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && <Chat />}
      {activeTab === 'batch' && <BatchScore />}
      {activeTab === 'import' && <Import />}
      {activeTab === 'usage' && <Usage />}
      {activeTab === 'analysis' && <Analysis />}
    </div>
  )
}
