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

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        rep: { select: { id: true, fullName: true, phone: true } },
      },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('[GET /api/admin/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
