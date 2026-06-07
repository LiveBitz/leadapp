'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Rep {
  id: string
  fullName: string
  phone: string | null
  createdAt: string
}

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
  const router = useRouter()

  const [rep, setRep] = useState<Rep | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!repId) return
    Promise.all([
      fetch(`/api/admin/reps/${repId}`).then((r) => r.json()),
      fetch(`/api/admin/leads/${repId}`).then((r) => r.json()),
    ])
      .then(([repData, leadsData]) => {
        if (repData.error) throw new Error(repData.error)
        if (leadsData.error) throw new Error(leadsData.error)
        setRep(repData)
        setLeads(leadsData)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [repId])

  async function handleDeleteRep() {
    if (!rep) return
    const confirmed = window.confirm(
      `Remove "${rep.fullName}"?\n\nThis will permanently delete this rep account and all ${leads.length} of their captured leads. This cannot be undone.`,
    )
    if (!confirmed) return

    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/reps/${repId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete rep')
      router.replace('/admin')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete rep')
      setDeleting(false)
    }
  }

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

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="text-[#2563eb] hover:underline text-sm font-medium">
              ← Admin Overview
            </Link>
            {rep && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">
                    {rep.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#111111]">{rep.fullName}</h1>
                  <p className="text-[#6b7280] text-sm">{rep.phone ?? '—'}</p>
                </div>
              </div>
            )}
          </div>

          {rep && (
            <button
              onClick={handleDeleteRep}
              disabled={deleting}
              className="mt-7 px-4 py-2 rounded-xl border border-[#fca5a5] text-[#991b1b] text-sm font-medium hover:bg-[#fee2e2] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {deleting ? 'Removing…' : 'Remove Rep'}
            </button>
          )}
        </div>

        {deleteError && (
          <div className="bg-[#fee2e2] border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-[#991b1b] text-sm font-medium">{deleteError}</p>
          </div>
        )}

        {/* Stats summary */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total', count: leads.length, color: 'text-[#111111]' },
              {
                label: 'Interested',
                count: leads.filter((l) => l.status === 'interested').length,
                color: 'text-[#166534]',
              },
              {
                label: 'Not Interested',
                count: leads.filter((l) => l.status === 'not_interested').length,
                color: 'text-[#991b1b]',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[#f9fafb] border border-[#e5e5e5] rounded-2xl p-4 text-center"
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-[#6b7280] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
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
