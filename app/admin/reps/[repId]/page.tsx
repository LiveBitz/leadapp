'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Lead {
  id: string
  name: string
  phone: string
  status: 'pending' | 'interested' | 'not_interested'
  notes: string
  createdAt: string
  updatedAt: string
}

type Filter = 'all' | 'pending' | 'interested' | 'not_interested'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'interested', label: 'Interested' },
  { key: 'not_interested', label: 'Not Interested' },
]

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

export default function RepLeadsPage() {
  const { repId } = useParams<{ repId: string }>()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!repId) return
    fetch(`/api/admin/leads/${repId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load leads')
        return data
      })
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [repId])

  const filtered = leads.filter((l) => filter === 'all' || l.status === filter)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-[#2563eb] hover:underline text-sm font-medium">
            ← Admin Overview
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Captured Leads</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#f5f5f5] text-[#6b7280] hover:bg-[#e5e5e5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-[#fee2e2] border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-[#991b1b] font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-[#f5f5f5] rounded-2xl p-16 text-center">
            <p className="text-[#6b7280]">No leads match this filter.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#d1d5db] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111111] text-base">{lead.name}</p>
                    <p className="text-[#6b7280] text-sm mt-0.5">{lead.phone}</p>
                    {lead.notes && (
                      <p className="text-[#6b7280] text-sm mt-2 leading-relaxed">{lead.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status]}`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                    <p className="text-xs text-[#6b7280]">Updated {formatDate(lead.updatedAt)}</p>
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
