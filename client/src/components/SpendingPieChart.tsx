import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CategorySummary } from '../types'
import { useTheme } from '../context/ThemeContext'

interface Props {
  data: CategorySummary[]
}

export function SpendingPieChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const tooltipStyle = isDark
    ? { fontSize: 12, borderRadius: 8, border: '1px solid #52525b', backgroundColor: '#3f3f46', color: '#f4f4f5' }
    : { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#111827' }

  const legendColor = isDark ? '#a1a1aa' : '#6b7280'

  const filtered = data.filter(c => c.spent > 0)

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-4">Spending by category</h2>
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-gray-400 dark:text-zinc-500 text-sm">No expenses this month.</p>
        </div>
      </div>
    )
  }

  const chartData = filtered.map(c => ({ name: c.name, value: c.spent, color: c.color }))

  return (
    <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Spending by category</h2>
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
            contentStyle={tooltipStyle}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={value => <span style={{ fontSize: 12, color: legendColor }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
