import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRepIdFromRequest } from '@/lib/repAuth'

function isNotFound(e: unknown): boolean {
  return (e as { code?: string })?.code === 'P2025'
}

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

    return NextResponse.json(lead)
  } catch (error) {
    console.error('[GET /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // deleteMany does ownership check + delete in one query (call_logs cascade automatically)
    const { count } = await prisma.lead.deleteMany({ where: { id, repId } })
    if (count === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, notes } = body as { status: string; notes?: string }

    if (!['interested', 'not_interested', 'deal_closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "interested", "not_interested", or "deal_closed".' },
        { status: 400 },
      )
    }

    // Ownership check + update in one query
    const { count } = await prisma.lead.updateMany({
      where: { id, repId },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
      },
    })
    if (count === 0) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    // Fetch updated record + create call log in parallel — single round trip
    const [updated] = await Promise.all([
      prisma.lead.findUnique({ where: { id } }),
      prisma.callLog.create({ data: { leadId: id, repId, outcome: status } }),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    if (isNotFound(error)) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
