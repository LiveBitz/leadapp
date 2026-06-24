import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setUTCHours(23, 59, 59, 999)
  return date
}

function formatDayLabel(date: Date, todayKey: string, yesterdayKey: string) {
  const key = date.toISOString().slice(0, 10)
  if (key === todayKey) return 'Today'
  if (key === yesterdayKey) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const requestedFrom = parseDateParam(searchParams.get('from'))
    const requestedTo = parseDateParam(searchParams.get('to'), true)
    const hasDateFilter = Boolean(requestedFrom || requestedTo)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)

    const start = requestedFrom ?? new Date(today)
    if (!requestedFrom) start.setUTCDate(start.getUTCDate() - 6)

    const end = requestedTo ?? new Date(today)
    if (!requestedTo) end.setUTCHours(23, 59, 59, 999)

    if (start > end) {
      return NextResponse.json({ error: 'From date must be before to date' }, { status: 400 })
    }

    // ── Build day labels for the chart ──────────────────────────────────────
    const days: { date: string; label: string }[] = []
    const cursor = new Date(start)
    cursor.setUTCHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setUTCHours(0, 0, 0, 0)

    while (cursor <= endDay) {
      const label = hasDateFilter
        ? formatDayLabel(cursor, today.toISOString().slice(0, 10), yesterday.toISOString().slice(0, 10))
        : cursor.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      days.push({ date: cursor.toISOString(), label })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    // ── Fetch only the chart window leads (uses createdAt index) ────────────
    const windowLeads = await prisma.lead.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, direction: true, status: true },
    })

    const daily = days.map(({ date, label }) => {
      const dayStart = new Date(date)
      const dayEnd = new Date(dayStart)
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
      const dayLeads = windowLeads.filter((l) => l.createdAt >= dayStart && l.createdAt < dayEnd)
      return {
        label,
        total:          dayLeads.length,
        incoming:       dayLeads.filter((l) => l.direction === 'incoming').length,
        outgoing:       dayLeads.filter((l) => l.direction === 'outgoing').length,
        interested:     dayLeads.filter((l) => l.status === 'interested').length,
        not_interested: dayLeads.filter((l) => l.status === 'not_interested').length,
        pending:        dayLeads.filter((l) => l.status === 'pending').length,
      }
    })

    // ── Summary counts — use groupBy instead of fetching all rows ───────────
    // When a date filter is active, summary reflects that window.
    // When no filter, summary reflects all-time totals via COUNT queries.
    const summaryWhere = hasDateFilter ? { createdAt: { gte: start, lte: end } } : {}

    const [statusGroups, directionGroups, todayCount] = await Promise.all([
      // COUNT per status — hits (status) or (repId, status) index
      prisma.lead.groupBy({
        by: ['status'],
        where: summaryWhere,
        _count: { _all: true },
      }),
      // COUNT per direction
      prisma.lead.groupBy({
        by: ['direction'],
        where: summaryWhere,
        _count: { _all: true },
      }),
      // Today count — hits createdAt index
      prisma.lead.count({
        where: {
          createdAt: {
            gte: today,
            lte: new Date(today.getTime() + 86_400_000 - 1),
          },
        },
      }),
    ])

    const countByStatus = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    )
    const countByDir = Object.fromEntries(
      directionGroups.map((g) => [g.direction, g._count._all]),
    )
    const total = statusGroups.reduce((s, g) => s + g._count._all, 0)

    const summary = {
      total,
      incoming:       countByDir['incoming']       ?? 0,
      outgoing:       countByDir['outgoing']        ?? 0,
      interested:     countByStatus['interested']   ?? 0,
      not_interested: countByStatus['not_interested'] ?? 0,
      pending:        countByStatus['pending']      ?? 0,
      today:          todayCount,
    }

    return NextResponse.json({ daily, summary, isFiltered: hasDateFilter })
  } catch (error) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
