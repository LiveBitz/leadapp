'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Rep {
  id: string
  fullName: string
  phone: string | null
}

interface Lead {
  id: string
  name: string
  phone: string
  status: 'pending' | 'interested' | 'not_interested'
  direction: 'incoming' | 'outgoing'
  notes: string
  createdAt: string
  updatedAt: string
  rep: Rep | null
}

const STATUS_STYLES: Record<Lead['status'], string> = {
  pending: 'bg-[#fef9c3] text-[#854d0e]',
  interested: 'bg-[#dcfce7] text-[#166534]',
  not_interested: 'bg-[#fee2e2] text-[#991b1b]',
}

const STATUS_LABELS: Record<Lead['status'], string> = {
  pending: 'Pending',
  interested: 'Interested',
  not_interested: 'Not Interested',
}

const PAGE_TITLES: Record<string, string> = {
  today: "Today's Calls",
  interested: 'Interested Leads',
  pending: 'Pending Leads',
  all: 'All Leads',
}

function LeadsContent() {
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter') ?? 'all'

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filter === 'today') {
      params.set('date', new Date().toISOString().slice(0, 10))
    } else if (filter === 'interested' || filter === 'pending' || filter === 'not_interested') {
      params.set('status', filter)
    }

    fetch(`/api/admin/leads?${params}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Failed to load')
        return data
      })
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.rep?.fullName.toLowerCase().includes(q) ?? false)
    )
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[#2563eb] hover:underline text-sm font-medium flex-shrink-0">
            ← Admin Overview
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111]">
            {PAGE_TITLES[filter] ?? 'Leads'}
          </h1>
          {!loading && (
            <span className="ml-auto text-sm text-[#6b7280] flex-shrink-0">
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or rep…"
            className="w-full border border-[#e5e5e5] rounded-xl pl-10 pr-8 py-2.5 text-sm text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] text-lg leading-none">×</button>
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
          <div className="bg-[#f5f5f5] rounded-2xl p-16 text-center">
            <p className="text-[#6b7280]">
              {search.trim() ? `No leads match "${search}".` : 'No leads found.'}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((lead) => (
              <div key={lead.id} className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-5 hover:border-[#d1d5db] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111111] text-sm sm:text-base truncate">{lead.name}</p>
                    <p className="text-[#6b7280] text-xs sm:text-sm mt-0.5">{lead.phone}</p>

                    {/* Rep badge */}
                    {lead.rep && (
                      <Link
                        href={`/admin/reps/${lead.rep.id}`}
                        className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#f0f4ff] text-[#2563eb] text-xs font-medium hover:bg-[#dbeafe] transition-colors"
                      >
                        <span>👤</span>
                        <span>{lead.rep.fullName}</span>
                      </Link>
                    )}

                    {lead.notes ? (
                      <p className="text-[#6b7280] text-xs mt-2 leading-relaxed line-clamp-2">{lead.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.direction === 'incoming' ? 'bg-[#eff6ff] text-[#2563eb]' : 'bg-[#f0fdf4] text-[#16a34a]'}`}>
                      {lead.direction === 'incoming' ? '↙ In' : '↗ Out'}
                    </span>
                    <p className="text-xs text-[#6b7280] whitespace-nowrap">{formatDate(lead.updatedAt)}</p>
                  </div>
                </div>
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
