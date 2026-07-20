import { NextRequest, NextResponse } from 'next/server'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
import { getRepIdFromRequest } from '@/lib/repAuth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const lead = await prisma.lead.findFirst({
      where: { id, repId },
    })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    const logs = await prisma.callLog.findMany({
      where: { leadId: id },
      orderBy: { calledAt: 'desc' },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[GET /api/leads/[id]/logs]', error)
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
  }
}
