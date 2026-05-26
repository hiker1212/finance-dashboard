import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

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
  const chartData = data.map(d => ({
    month: fmtMonth(d.month),
    Income: d.income,
    Expenses: d.expenses,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Income vs Expenses — last 6 months</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={value => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
          />
          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
