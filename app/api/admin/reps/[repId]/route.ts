import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

function isNotFound(e: unknown): boolean {
  return (e as { code?: string })?.code === 'P2025'
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repId } = await params
    const { fullName, password } = (await req.json()) as {
      fullName?: string
      password?: string
    }

    if (!fullName?.trim() && !password) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const data: { fullName?: string; passwordHash?: string } = {}
    if (fullName?.trim()) data.fullName = fullName.trim()
    if (password) data.passwordHash = await bcrypt.hash(password, 12)

    // Single query — update returns P2025 if not found, no separate findUnique needed
    try {
      const updated = await prisma.profile.update({
        where: { id: repId },
        data,
        select: { id: true, fullName: true, phone: true, createdAt: true },
      })
      return NextResponse.json(updated)
    } catch (e) {
      if (isNotFound(e)) {
        return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
      }
      throw e
    }
  } catch (error) {
    console.error('[PATCH /api/admin/reps/[repId]]', error)
    return NextResponse.json({ error: 'Failed to update rep' }, { status: 500 })
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

    // Transaction handles existence check — P2025 thrown if profile not found
    try {
      await prisma.$transaction([
        prisma.callLog.deleteMany({ where: { repId } }),
        prisma.lead.deleteMany({ where: { repId } }),
        prisma.profile.delete({ where: { id: repId } }),
      ])
    } catch (e) {
      if (isNotFound(e)) {
        return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
      }
      throw e
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/reps/[repId]]', error)
    return NextResponse.json({ error: 'Failed to delete rep' }, { status: 500 })
  }
}
