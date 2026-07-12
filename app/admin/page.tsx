'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import DateRangePicker from '@/components/DateRangePicker'
import { useVisiblePolling } from '@/hooks/useVisiblePolling'

const CallsChart = dynamic(() => import('@/components/CallsChart'), { ssr: false })

interface DayStat {
  label: string
  total: number
  incoming: number
  outgoing: number
  missed: number
  interested: number
  not_interested: number
  pending: number
  deal_closed: number
}

interface Summary {
  total: number
  incoming: number
  outgoing: number
  missed: number
  interested: number
  not_interested: number
  pending: number
  deal_closed: number
  today: number
  missed_today: number
}

interface Rep {
  id: string
  full_name: string
  phone: string | null
  total_leads: number
  interested_count: number
  not_interested_count: number
  pending_count: number
  deal_closed_count: number
  missed_count: number
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [reps, setReps] = useState<Rep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<{ daily: DayStat[]; summary: Summary; isFiltered?: boolean } | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback((showSpinner: boolean) => {
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    const qs = params.toString() ? `?${params}` : ''

    if (showSpinner) { setLoading(true); setError(null) }

    fetch(`/api/admin/stats${qs}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data) })
      .catch(() => {})

    fetch(`/api/admin/reps${qs}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to load reps')
        return data
      })
      .then((data) => setReps(data))
      .catch((e) => { if (showSpinner) setError(e.message) })
      .finally(() => { if (showSpinner) setLoading(false) })
  }, [fromDate, toDate])

  useEffect(() => {
    load(true)
  }, [load])

  // Poll so newly captured calls (including missed ones) show up without a manual
  // refresh — but only while this tab is actually visible, so a forgotten background
  // tab doesn't keep the database awake for nothing.
  useVisiblePolling(useCallback(() => load(false), [load]), 20000)

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">LeadTracker</h1>
              <p className="text-[#6b7280] mt-0.5 text-sm">Admin Overview</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/admin/reps/create"
                className="px-3 sm:px-4 py-2 sm:py-2.5 border border-[#e5e5e5] rounded-xl text-xs sm:text-sm font-medium text-[#111111] hover:bg-[#f5f5f5] transition-colors whitespace-nowrap"
              >
                + Add Rep
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="px-3 sm:px-4 py-2 sm:py-2.5 border border-[#e5e5e5] rounded-xl text-xs sm:text-sm font-medium text-[#6b7280] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>

        {/* Date range filter */}
        <div className="mb-5 p-3 bg-[#f9fafb] border border-[#e5e5e5] rounded-2xl">
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={(f, t) => { setFromDate(f); setToDate(t) }}
          />
        </div>

        {/* Search */}
        {!loading && !error && reps.length > 0 && (
          <div className="relative mb-5">
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

        {/* Chart */}
        {stats && (
          <CallsChart
            daily={stats.daily}
            summary={stats.summary}
            isFiltered={stats.isFiltered}
            fromDate={fromDate}
            toDate={toDate}
          />
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
          <div className="bg-[#f5f5f5] rounded-2xl p-12 text-center">
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
          <div className="flex flex-col gap-3">
            {filtered.map((rep) => (
              <Link
                key={rep.id}
                href={`/admin/reps/${rep.id}`}
                className="block bg-white border border-[#e5e5e5] rounded-2xl p-4 sm:p-6 hover:border-[#2563eb] hover:shadow-sm transition-all group"
              >
                {/* Mobile: stack, Desktop: row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-base sm:text-lg">
                        {rep.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111111] text-base group-hover:text-[#2563eb] transition-colors truncate">
                        {rep.full_name}
                      </p>
                      <p className="text-[#6b7280] text-sm">{rep.phone ?? '—'}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                    <div className="text-center min-w-[36px]">
                      <p className="text-xl sm:text-2xl font-bold text-[#111111]">{rep.total_leads}</p>
                      <p className="text-xs text-[#6b7280]">Total</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {rep.missed_count > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fef2f2] text-[#dc2626] whitespace-nowrap">
                          {rep.missed_count} Missed
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#fef9c3] text-[#854d0e] whitespace-nowrap">
                        {rep.pending_count} Pending
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#dcfce7] text-[#166534] whitespace-nowrap">
                        {rep.interested_count} Interested
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#fee2e2] text-[#991b1b] whitespace-nowrap">
                        {rep.not_interested_count} Not Interested
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#ede9fe] text-[#5b21b6] whitespace-nowrap">
                        {rep.deal_closed_count} Deal Closed
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
