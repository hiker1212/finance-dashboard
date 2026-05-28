import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../context/ThemeContext'

export interface TrendDataPoint {
  month: string
  income: number
  expenses: number
}

interface Props {
  data: TrendDataPoint[]
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtMonth(yyyymm: string) {
  const [, m] = yyyymm.split('-').map(Number)
  return MONTH_ABBR[m - 1]
}

export function MonthlyTrendChart({ data }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridColor = isDark ? '#52525b' : '#e5e7eb'
  const tickColor = isDark ? '#a1a1aa' : '#6b7280'
  const tooltipStyle = isDark
    ? { fontSize: 12, borderRadius: 8, border: '1px solid #52525b', backgroundColor: '#3f3f46', color: '#f4f4f5' }
    : { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#111827' }
  const legendColor = isDark ? '#a1a1aa' : '#6b7280'

  const chartData = data.map(d => ({
    month: fmtMonth(d.month),
    Income: d.income,
    Expenses: d.expenses,
  }))

  return (
    <div className="bg-white border border-gray-200 dark:bg-zinc-700 dark:border-zinc-600 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Income vs Expenses — last 6 months</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: tickColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`]}
            contentStyle={tooltipStyle}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={value => <span style={{ fontSize: 12, color: legendColor }}>{value}</span>}
          />
          <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
