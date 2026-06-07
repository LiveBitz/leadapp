import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repId } = await params

    const leads = await prisma.lead.findMany({
      where: { repId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('[GET /api/admin/leads/[repId]]', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
