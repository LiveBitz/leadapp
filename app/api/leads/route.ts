import { NextRequest, NextResponse } from 'next/server'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
import { getRepIdFromRequest } from '@/lib/repAuth'

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
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    )
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'), true)

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
    // explicit, occasional action, never by the paginated list render.
    if (searchParams.get('all') === 'true') {
      const allLeads = await prisma.lead.findMany({ where, orderBy: { updatedAt: 'desc' } })
      return NextResponse.json({ leads: allLeads, nextCursor: null })
    }

    // Cursor-based pagination — an indexed keyset seek regardless of how deep the
    // page is, unlike OFFSET/skip which gets slower the further in you page.
    // `id` is a secondary sort key so rows with an identical updatedAt (common
    // when many calls land in the same second) still get a stable, gap-free order.
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
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
