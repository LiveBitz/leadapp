'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DayStat {
  label: string
  total: number
  incoming: number
  outgoing: number
  interested: number
  not_interested: number
  pending: number
}

interface Summary {
  total: number
  incoming: number
  outgoing: number
  interested: number
  not_interested: number
  pending: number
  today: number
}

interface Props {
  daily: DayStat[]
  summary: Summary
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-[#111111] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-[#6b7280]">{p.name}:</span>
          <span className="font-medium text-[#111111]">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function CallsChart({ daily, summary }: Props) {
  const summaryCards = [
    { label: "Today's Calls", value: summary.today, color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' },
    { label: 'Total Leads', value: summary.total, color: 'text-[#111111]', bg: 'bg-[#f9fafb]' },
    { label: 'Interested', value: summary.interested, color: 'text-[#166534]', bg: 'bg-[#dcfce7]' },
    { label: 'Pending', value: summary.pending, color: 'text-[#854d0e]', bg: 'bg-[#fef9c3]' },
  ]

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6 mb-6">
      <h2 className="text-base sm:text-lg font-bold text-[#111111] mb-1">Call Activity</h2>
      <p className="text-xs text-[#6b7280] mb-5">Last 7 days — incoming &amp; outgoing calls captured</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5', radius: 4 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="square"
            iconSize={10}
          />
          <Bar dataKey="outgoing" name="Outgoing" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="incoming" name="Incoming" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
