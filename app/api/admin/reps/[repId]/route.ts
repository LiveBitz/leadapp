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

    const rep = await prisma.profile.findUnique({
      where: { id: repId, role: 'rep' },
      select: { id: true, fullName: true, phone: true, createdAt: true },
    })
    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
    }

    return NextResponse.json(rep)
  } catch (error) {
    console.error('[GET /api/admin/reps/[repId]]', error)
    return NextResponse.json({ error: 'Failed to fetch rep' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repId } = await params

    const rep = await prisma.profile.findUnique({
      where: { id: repId, role: 'rep' },
    })
    if (!rep) {
      return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
    }

    // Delete in order: call_logs → leads → profile
    // (call_logs also cascade from leads, but deleting by repId first is explicit)
    await prisma.$transaction([
      prisma.callLog.deleteMany({ where: { repId } }),
      prisma.lead.deleteMany({ where: { repId } }),
      prisma.profile.delete({ where: { id: repId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/reps/[repId]]', error)
    return NextResponse.json({ error: 'Failed to delete rep' }, { status: 500 })
  }
}
