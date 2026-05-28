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
    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5">
      <h2 className="text-sm font-semibold text-zinc-300 mb-2">Income vs Expenses — last 6 months</h2>
      <div className="chart-glow">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${v}`}
              width={56}
            />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #3f3f46', backgroundColor: '#27272a', color: '#d4d4d8' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={value => <span style={{ fontSize: 12, color: '#a1a1aa' }}>{value}</span>}
            />
            <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
