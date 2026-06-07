import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const existing = await prisma.lead.findFirst({
      where: { id, repId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    // call_logs cascade-delete automatically (onDelete: Cascade in schema)
    await prisma.lead.delete({ where: { id } })

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

    if (!['interested', 'not_interested'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "interested" or "not_interested".' },
        { status: 400 },
      )
    }

    const existing = await prisma.lead.findFirst({
      where: { id, repId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 })
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    await prisma.callLog.create({
      data: { leadId: id, repId, outcome: status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/leads/[id]]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
