import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')   // pending | interested | not_interested
    const date = searchParams.get('date')        // ISO date string — filter by that day only

    const where: Record<string, unknown> = {}

    if (status) where.status = status

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.createdAt = { gte: start, lte: end }
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
