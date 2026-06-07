import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRepIdFromRequest } from '@/lib/repAuth'

export async function GET(req: NextRequest) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leads = await prisma.lead.findMany({
      where: { repId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('[GET /api/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
