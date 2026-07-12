import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setUTCHours(23, 59, 59, 999)
  return date
}

export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')       // pending | interested | not_interested
    const direction = searchParams.get('direction') // incoming | outgoing | missed
    const date = searchParams.get('date')            // ISO date string — filter by that day only
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'), true)
    const q = searchParams.get('q')?.trim()
    const cursor = searchParams.get('cursor')
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    )

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (direction) where.direction = direction

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.createdAt = { gte: start, lte: end }
    } else if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { rep: { fullName: { contains: q, mode: 'insensitive' } } },
      ]
    }

    // CSV export needs the full matching set in one shot — spans every rep, so
    // this is only ever used by that explicit, occasional action, never polling.
    if (searchParams.get('all') === 'true') {
      const allLeads = await prisma.lead.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: { rep: { select: { id: true, fullName: true, phone: true } } },
      })
      return NextResponse.json({ leads: allLeads, nextCursor: null })
    }

    // Cursor-based pagination — this endpoint spans every rep's leads combined,
    // so it's the single most important place to avoid an unbounded fetch.
    // Total is only fetched on page 1 (no cursor) — a cheap indexed COUNT, and
    // no reason to repeat it on every subsequent "Load More".
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { rep: { select: { id: true, fullName: true, phone: true } } },
      }),
      cursor ? Promise.resolve(null) : prisma.lead.count({ where }),
    ])

    const hasMore = leads.length > limit
    const page = hasMore ? leads.slice(0, limit) : leads
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return NextResponse.json({ leads: page, nextCursor, ...(total !== null ? { total } : {}) })
  } catch (error) {
    console.error('[GET /api/admin/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
