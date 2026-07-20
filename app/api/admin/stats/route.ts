import { NextRequest, NextResponse } from 'next/server'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
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

    // ── Chart window counts — grouped by day/direction/status directly in
    // SQLite instead of pulling every matching lead row into the app and
    // counting in JS. Result set is at most (days × directions × statuses)
    // rows, regardless of how many leads actually fall in the window.
    // D1/SQLite note: dates are stored as ISO-8601 text, and date() returns a
    // plain "YYYY-MM-DD" string (not a Date object like Postgres' date_trunc),
    // so `day` is compared directly as a string below.
    const buckets = await prisma.$queryRaw<
      { day: string; direction: string; status: string; count: number }[]
    >`
      SELECT date(created_at) AS day, direction, status, COUNT(*) AS count
      FROM leads
      WHERE created_at >= ${start.toISOString()} AND created_at <= ${end.toISOString()}
      GROUP BY day, direction, status
    `

    const daily = days.map(({ date, label }) => {
      const dayKey = date.slice(0, 10)
      const dayBuckets = buckets.filter((b) => b.day === dayKey)
      const sumWhere = (pred: (b: typeof dayBuckets[number]) => boolean) =>
        dayBuckets.filter(pred).reduce((s, b) => s + b.count, 0)
      return {
        label,
        total:          dayBuckets.reduce((s, b) => s + b.count, 0),
        incoming:       sumWhere((b) => b.direction === 'incoming'),
        outgoing:       sumWhere((b) => b.direction === 'outgoing'),
        missed:         sumWhere((b) => b.direction === 'missed'),
        interested:     sumWhere((b) => b.status === 'interested'),
        not_interested: sumWhere((b) => b.status === 'not_interested'),
        pending:        sumWhere((b) => b.status === 'pending'),
        deal_closed:    sumWhere((b) => b.status === 'deal_closed'),
      }
    })

    // ── Summary counts — use groupBy instead of fetching all rows ───────────
    // When a date filter is active, summary reflects that window.
    // When no filter, summary reflects all-time totals via COUNT queries.
    const summaryWhere = hasDateFilter ? { createdAt: { gte: start, lte: end } } : {}

    const [statusGroups, directionGroups, todayCount, missedTodayCount] = await Promise.all([
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
      // Missed-today count — surfaced separately so it's visible at a glance
      prisma.lead.count({
        where: {
          direction: 'missed',
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
      missed:         countByDir['missed']          ?? 0,
      interested:     countByStatus['interested']   ?? 0,
      not_interested: countByStatus['not_interested'] ?? 0,
      pending:        countByStatus['pending']      ?? 0,
      deal_closed:    countByStatus['deal_closed']  ?? 0,
      today:          todayCount,
      missed_today:   missedTodayCount,
    }

    return NextResponse.json({ daily, summary, isFiltered: hasDateFilter })
  } catch (error) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
