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
  const [search, setSearch] = useState('')

  // edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // delete state
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

  function openEdit() {
    setEditName(rep?.fullName ?? '')
    setEditPassword('')
    setSaveError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!editName.trim() && !editPassword) return
    setSaving(true)
    setSaveError(null)
    try {
      const body: { fullName?: string; password?: string } = {}
      if (editName.trim() && editName.trim() !== rep?.fullName) body.fullName = editName.trim()
      if (editPassword) body.password = editPassword

      if (Object.keys(body).length === 0) {
        setEditing(false)
        setSaving(false)
        return
      }

      const res = await fetch(`/api/admin/reps/${repId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setRep(data)
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

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

  const filtered = leads.filter((l) => {
    const matchesFilter = filter === 'all' || l.status === filter
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q)
    return matchesFilter && matchesSearch
  })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Back link */}
        <Link href="/admin" className="text-[#2563eb] hover:underline text-sm font-medium">
          ← Admin Overview
        </Link>

        {/* Rep header */}
        {rep && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-xl">
                  {rep.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#111111] truncate">{rep.fullName}</h1>
                <p className="text-[#6b7280] text-sm">{rep.phone ?? '—'}</p>
              </div>
            </div>

            {!editing && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={openEdit}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-[#e5e5e5] text-[#111111] text-sm font-medium hover:bg-[#f5f5f5] transition-colors text-center"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteRep}
                  disabled={deleting}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-[#fca5a5] text-[#991b1b] text-sm font-medium hover:bg-[#fee2e2] transition-colors disabled:opacity-50 text-center"
                >
                  {deleting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit form */}
        {editing && rep && (
          <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-base font-semibold text-[#111111] mb-4">Edit Rep</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  New Password{' '}
                  <span className="text-[#9ca3af] font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                  placeholder="New password"
                />
              </div>
              {saveError && <p className="text-[#991b1b] text-sm">{saveError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#2563eb] text-white text-sm font-medium rounded-xl hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 text-center"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-[#e5e5e5] text-[#6b7280] text-sm font-medium rounded-xl hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="bg-[#fee2e2] border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-[#991b1b] text-sm font-medium">{deleteError}</p>
          </div>
        )}

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
            {[
              { label: 'Total', count: leads.length, color: 'text-[#111111]' },
              { label: 'Interested', count: leads.filter((l) => l.status === 'interested').length, color: 'text-[#166534]' },
              { label: 'Not Interested', count: leads.filter((l) => l.status === 'not_interested').length, color: 'text-[#991b1b]' },
            ].map((s) => (
              <div key={s.label} className="bg-[#f9fafb] border border-[#e5e5e5] rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-[#6b7280] mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!loading && !error && (
          <div className="relative mb-3">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone number…"
              className="w-full border border-[#e5e5e5] rounded-xl pl-10 pr-8 py-2.5 text-sm text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Filter tabs */}
        {!loading && !error && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[#f5f5f5] text-[#6b7280] hover:bg-[#e5e5e5]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

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
          <div className="bg-[#f5f5f5] rounded-2xl p-12 text-center">
            <p className="text-[#6b7280]">
              {search.trim() ? `No leads match "${search.trim()}".` : 'No leads match this filter.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-5 hover:border-[#d1d5db] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#111111] text-sm sm:text-base truncate">{lead.name}</p>
                    <p className="text-[#6b7280] text-xs sm:text-sm mt-0.5">{lead.phone}</p>
                    {lead.notes && (
                      <p className="text-[#6b7280] text-xs sm:text-sm mt-2 leading-relaxed">{lead.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                    <p className="text-xs text-[#6b7280] whitespace-nowrap">Updated {formatDate(lead.updatedAt)}</p>
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
