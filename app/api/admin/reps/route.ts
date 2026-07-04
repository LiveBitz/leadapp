import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setUTCHours(23, 59, 59, 999)
  return date
}

export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'), true)
    const createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }

    const reps = await prisma.profile.findMany({
      where: { role: 'rep' },
      orderBy: { fullName: 'asc' },
      include: {
        capturedLeads: {
          where: Object.keys(createdAt).length ? { createdAt } : undefined,
          select: { status: true },
        },
      },
    })

    const result = reps.map((rep: typeof reps[number]) => ({
      id: rep.id,
      full_name: rep.fullName,
      phone: rep.phone,
      total_leads: rep.capturedLeads.length,
      interested_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'interested').length,
      not_interested_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'not_interested').length,
      pending_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'pending').length,
      deal_closed_count: rep.capturedLeads.filter((l: { status: string }) => l.status === 'deal_closed').length,
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
