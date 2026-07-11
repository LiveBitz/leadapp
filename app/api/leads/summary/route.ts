import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRepIdFromRequest } from '@/lib/repAuth'

export async function GET(req: NextRequest) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Aggregate counts only — never pulls the underlying rows, so this stays fast
    // regardless of how many leads the rep has captured.
    const statusGroups = await prisma.lead.groupBy({
      by: ['status'],
      where: { repId },
      _count: { _all: true },
    })

    const countByStatus = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    )
    const total = statusGroups.reduce((s, g) => s + g._count._all, 0)

    return NextResponse.json({
      total,
      pending: countByStatus['pending'] ?? 0,
      interested: countByStatus['interested'] ?? 0,
      not_interested: countByStatus['not_interested'] ?? 0,
      deal_closed: countByStatus['deal_closed'] ?? 0,
    })
  } catch (error) {
    console.error('[GET /api/leads/summary]', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
