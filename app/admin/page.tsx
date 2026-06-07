'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Rep {
  id: string
  full_name: string
  phone: string | null
  total_leads: number
  interested_count: number
  not_interested_count: number
  pending_count: number
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/reps')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load reps')
        return data
      })
      .then((data) => setReps(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = reps.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return r.full_name.toLowerCase().includes(q) || (r.phone ?? '').includes(q)
  })

  async function handleSignOut() {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/admin-login')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-[#111111] tracking-tight">LeadTracker</h1>
            <p className="text-[#6b7280] mt-1 text-sm">Admin Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reps/create"
              className="px-4 py-2.5 border border-[#e5e5e5] rounded-xl text-sm font-medium text-[#111111] hover:bg-[#f5f5f5] transition-colors"
            >
              + Add Rep
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2.5 border border-[#e5e5e5] rounded-xl text-sm font-medium text-[#6b7280] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Search */}
        {!loading && !error && reps.length > 0 && (
          <div className="relative mb-6">
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
              className="w-full border border-[#e5e5e5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111111] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
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

        {!loading && !error && reps.length === 0 && (
          <div className="bg-[#f5f5f5] rounded-2xl p-16 text-center">
            <p className="text-[#6b7280] text-lg">No sales reps found.</p>
            <p className="text-[#6b7280] text-sm mt-1">
              Add reps so their normal calls can be captured as leads.
            </p>
          </div>
        )}

        {!loading && !error && reps.length > 0 && filtered.length === 0 && (
          <div className="bg-[#f5f5f5] rounded-2xl p-12 text-center">
            <p className="text-[#6b7280]">No reps match &ldquo;{search}&rdquo;.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-4">
            {filtered.map((rep) => (
              <Link
                key={rep.id}
                href={`/admin/reps/${rep.id}`}
                className="block bg-white border border-[#e5e5e5] rounded-2xl p-6 hover:border-[#2563eb] hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {rep.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#111111] text-lg group-hover:text-[#2563eb] transition-colors">
                        {rep.full_name}
                      </p>
                      <p className="text-[#6b7280] text-sm">{rep.phone ?? '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#111111]">{rep.total_leads}</p>
                      <p className="text-xs text-[#6b7280]">Total</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fef9c3] text-[#854d0e]">
                        {rep.pending_count} Pending
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#dcfce7] text-[#166534]">
                        {rep.interested_count} Interested
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#fee2e2] text-[#991b1b]">
                        {rep.not_interested_count} Not Interested
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
