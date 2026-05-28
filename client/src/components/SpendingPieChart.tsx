import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CategorySummary } from '../types'

interface Props {
  data: CategorySummary[]
}

export function SpendingPieChart({ data }: Props) {
  const filtered = data.filter(c => c.spent > 0)

  if (filtered.length === 0) {
    return (
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Spending by category</h2>
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-zinc-500 text-sm">No expenses this month.</p>
        </div>
      </div>
    )
  }

  const chartData = filtered.map(c => ({ name: c.name, value: c.spent, color: c.color }))

  return (
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
      <h2 className="text-sm font-semibold text-zinc-300 mb-2">Spending by category</h2>
      <div className="chart-glow">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #3f3f46', backgroundColor: '#27272a', color: '#d4d4d8' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={value => <span style={{ fontSize: 12, color: '#a1a1aa' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
