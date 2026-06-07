import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reps = await prisma.profile.findMany({
      where: { role: 'rep' },
      orderBy: { fullName: 'asc' },
      include: { capturedLeads: { select: { status: true } } },
    })

    const result = reps.map((rep) => ({
      id: rep.id,
      full_name: rep.fullName,
      phone: rep.phone,
      total_leads: rep.capturedLeads.length,
      interested_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'interested').length,
      not_interested_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'not_interested').length,
      pending_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'pending').length,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/admin/reps]', error)
    return NextResponse.json({ error: 'Failed to fetch reps' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { firstName, lastName, phone, password } = (await req.json()) as {
      firstName?: string
      lastName?: string
      phone?: string
      password?: string
    }

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !password) {
      return NextResponse.json(
        { error: 'First name, last name, phone, and password are required' },
        { status: 400 },
      )
    }

    const exists = await prisma.profile.findUnique({ where: { phone: phone.trim() } })
    if (exists) {
      return NextResponse.json(
        { error: 'A rep with this phone number already exists' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const rep = await prisma.profile.create({
      data: {
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        passwordHash,
        role: 'rep',
      },
    })

    const { passwordHash: _, ...safeRep } = rep
    return NextResponse.json(safeRep, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/reps]', error)
    return NextResponse.json({ error: 'Failed to create rep' }, { status: 500 })
  }
}
