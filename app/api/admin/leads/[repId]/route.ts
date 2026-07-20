import { NextRequest, NextResponse } from 'next/server'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repId } = await params

    const { searchParams } = new URL(req.url)
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'), true)
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()
    const cursor = searchParams.get('cursor')
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    )

    const where: Record<string, unknown> = { repId }
    if (status && status !== 'all') where.status = status
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }
    if (q) {
      // SQLite's contains/LIKE is already case-insensitive for standard text by
      // default, so no `mode` option is needed (and D1 rejects it at runtime).
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
      ]
    }

    // CSV export needs the full matching set in one shot — used only by that
    // explicit, occasional action, never by the paginated page render.
    if (searchParams.get('all') === 'true') {
      const allLeads = await prisma.lead.findMany({ where, orderBy: { updatedAt: 'desc' } })
      return NextResponse.json({ leads: allLeads, nextCursor: null })
    }

    // Cursor-based pagination with `id` as a tiebreaker for stable ordering
    // when many leads share the same updatedAt.
    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = leads.length > limit
    const page = hasMore ? leads.slice(0, limit) : leads
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return NextResponse.json({ leads: page, nextCursor })
  } catch (error) {
    console.error('[GET /api/admin/leads/[repId]]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
