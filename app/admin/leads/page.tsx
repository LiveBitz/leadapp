'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import DateRangePicker from '@/components/DateRangePicker'

interface Rep {
  id: string
  fullName: string
  phone: string | null
}

interface Lead {
  id: string
  name: string
  phone: string
  status: 'pending' | 'interested' | 'not_interested' | 'deal_closed'
  direction: 'incoming' | 'outgoing' | 'missed'
  notes: string
  createdAt: string
  updatedAt: string
  rep: Rep | null
}

const STATUS_STYLES: Record<Lead['status'], string> = {
  pending:        'bg-[#fef9c3] text-[#854d0e]',
  interested:     'bg-[#dcfce7] text-[#166534]',
  not_interested: 'bg-[#fee2e2] text-[#991b1b]',
  deal_closed:    'bg-[#ede9fe] text-[#5b21b6]',
}
const STATUS_LABELS: Record<Lead['status'], string> = {
  pending:        'Pending',
  interested:     'Interested',
  not_interested: 'Not Interested',
  deal_closed:    'Deal Closed 🎉',
}
const PAGE_TITLES: Record<string, string> = {
  today:        "Today's Calls",
  missed:       'Missed Calls',
  interested:   'Interested Leads',
  pending:      'Pending Leads',
  deal_closed:  'Deal Closed Leads',
  all:          'All Leads',
}

/* ── tiny inline SVGs so no icon library needed ── */
function IconSearch() {
  return (
    <svg className="w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
    </svg>
  )
}
function IconArrowDown() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
function IconArrowUp() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}
function IconMissed() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

const DIRECTION_STYLES: Record<Lead['direction'], string> = {
  incoming: 'bg-[#eff6ff] text-[#2563eb]',
  outgoing: 'bg-[#f0fdf4] text-[#16a34a]',
  missed:   'bg-[#fef2f2] text-[#dc2626]',
}
const DIRECTION_LABELS: Record<Lead['direction'], string> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
  missed:   'Missed',
}
function DirectionIcon({ direction }: { direction: Lead['direction'] }) {
  if (direction === 'incoming') return <IconArrowDown />
  if (direction === 'outgoing') return <IconArrowUp />
  return <IconMissed />
}
function IconCalendar() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  )
}

function escapeCell(v: string | null | undefined) {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function downloadCSV(leads: Lead[], filename: string) {
  const headers = ['Name', 'Phone', 'Status', 'Direction', 'Rep', 'Rep Phone', 'Notes', 'Captured On', 'Updated On']
  const rows = leads.map((l) => [
    escapeCell(l.name),
    escapeCell(l.phone),
    escapeCell(l.status),
    escapeCell(l.direction),
    escapeCell(l.rep?.fullName),
    escapeCell(l.rep?.phone),
    escapeCell(l.notes),
    escapeCell(new Date(l.createdAt).toLocaleString()),
    escapeCell(new Date(l.updatedAt).toLocaleString()),
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function LeadsContent() {
  const searchParams  = useSearchParams()
  const filter        = searchParams.get('filter') ?? 'all'

  const [leads,    setLeads]    = useState<Lead[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter === 'today') {
      params.set('date', new Date().toISOString().slice(0, 10))
    } else if (filter === 'missed') {
      params.set('direction', 'missed')
    } else if (['interested', 'pending', 'not_interested', 'deal_closed'].includes(filter)) {
      params.set('status', filter)
    }
    if (fromDate) params.set('from', fromDate)
    if (toDate)   params.set('to',   toDate)

    function load(showSpinner: boolean) {
      if (showSpinner) setLoading(true)
      setError(null)
      fetch(`/api/admin/leads?${params}`)
        .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
        .then(setLeads)
        .catch((e) => { if (showSpinner) setError(e.message) })
        .finally(() => { if (showSpinner) setLoading(false) })
    }

    load(true)
    // Poll for new/updated leads so missed calls show up here in near real time.
    const interval = setInterval(() => load(false), 5000)
    return () => clearInterval(interval)
  }, [filter, fromDate, toDate])

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.rep?.fullName.toLowerCase().includes(q) ?? false)
  })

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center gap-1 text-[#2563eb] hover:underline text-sm font-medium mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Admin Overview
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111111]">
              {PAGE_TITLES[filter] ?? 'Leads'}
            </h1>
            {!loading && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-medium text-[#6b7280] bg-white border border-[#e5e5e5] px-3 py-1 rounded-full">
                  {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
                </span>
                {filtered.length > 0 && (
                  <button
                    onClick={() => {
                      const date = new Date().toISOString().slice(0, 10)
                      downloadCSV(filtered, `leads_${filter}_${date}.csv`)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] text-white text-xs font-medium rounded-xl hover:bg-[#333] transition-colors shadow-sm"
                    title="Download CSV"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    <span className="hidden sm:inline">Download CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date range filter — hidden on 'today' filter since that already pins the date */}
        {filter !== 'today' && (
          <div className="mb-4 p-3 bg-white border border-[#e5e5e5] rounded-2xl shadow-sm">
            <DateRangePicker
              from={fromDate}
              to={toDate}
              onChange={(f, t) => { setFromDate(f); setToDate(t) }}
            />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <IconSearch />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or rep…"
            className="w-full bg-white border border-[#e5e5e5] rounded-xl pl-10 pr-8 py-2.5 text-sm text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] text-xl leading-none">×</button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#fee2e2] border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-[#991b1b] font-medium">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white border border-[#e5e5e5] rounded-2xl p-16 text-center shadow-sm">
            <p className="text-[#6b7280]">
              {search.trim() ? `No leads match "${search}".` : 'No leads found.'}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((lead) => (
              <div key={lead.id} className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[#d1d5db] transition-all">

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  {/* Left: name + phone + rep */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111111] text-sm sm:text-base truncate">{lead.name}</p>
                    <p className="text-[#6b7280] text-xs sm:text-sm mt-0.5 truncate">{lead.phone}</p>

                    {lead.rep && (
                      <Link
                        href={`/admin/reps/${lead.rep.id}`}
                        className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-[#f0f4ff] text-[#2563eb] text-xs font-medium hover:bg-[#dbeafe] transition-colors"
                      >
                        <IconUser />
                        <span className="truncate max-w-[140px]">{lead.rep.fullName}</span>
                      </Link>
                    )}
                  </div>

                  {/* Right: badges */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {/* Status */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>

                    {/* Direction */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${DIRECTION_STYLES[lead.direction]}`}>
                      <DirectionIcon direction={lead.direction} />
                      {DIRECTION_LABELS[lead.direction]}
                    </span>

                    {/* Date */}
                    <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af]">
                      <IconCalendar />
                      {fmt(lead.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {lead.notes && (
                  <p className="mt-3 pt-3 border-t border-[#f3f4f6] text-xs text-[#6b7280] leading-relaxed line-clamp-2">
                    {lead.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminLeadsPage() {
  return (
    <Suspense>
      <LeadsContent />
    </Suspense>
  )
}
