'use client'

interface Props {
  from: string   // 'YYYY-MM-DD' or ''
  to: string
  onChange: (from: string, to: string) => void
  className?: string
}

export default function DateRangePicker({ from, to, onChange, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide whitespace-nowrap">
        Date range
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
          className="border border-[#e5e5e5] rounded-xl px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent bg-white shadow-sm"
        />
        <span className="text-[#9ca3af] text-xs">→</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value)}
          className="border border-[#e5e5e5] rounded-xl px-3 py-1.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent bg-white shadow-sm"
        />
        {(from || to) && (
          <button
            onClick={() => onChange('', '')}
            title="Clear date filter"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#6b7280] text-lg leading-none transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
