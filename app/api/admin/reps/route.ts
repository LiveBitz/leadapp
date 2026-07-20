import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
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

    const leadWhere = Object.keys(createdAt).length ? { createdAt } : {}

    // Aggregate counts via groupBy instead of pulling every lead row per rep —
    // this used to fetch every lead's {status, direction} on every poll just to
    // count them in JS, which scales with total lead count across all reps.
    const [reps, statusGroups, directionGroups] = await Promise.all([
      prisma.profile.findMany({
        where: { role: 'rep' },
        orderBy: { fullName: 'asc' },
        select: { id: true, fullName: true, phone: true },
      }),
      prisma.lead.groupBy({
        by: ['repId', 'status'],
        where: { repId: { not: null }, ...leadWhere },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ['repId', 'direction'],
        where: { repId: { not: null }, direction: 'missed', ...leadWhere },
        _count: { _all: true },
      }),
    ])

    const statusCountsByRep = new Map<string, Record<string, number>>()
    for (const g of statusGroups) {
      if (!g.repId) continue
      const counts = statusCountsByRep.get(g.repId) ?? {}
      counts[g.status] = g._count._all
      statusCountsByRep.set(g.repId, counts)
    }
    const missedCountByRep = new Map<string, number>()
    for (const g of directionGroups) {
      if (!g.repId) continue
      missedCountByRep.set(g.repId, g._count._all)
    }

    const result = reps.map((rep: typeof reps[number]) => {
      const counts = statusCountsByRep.get(rep.id) ?? {}
      const total = Object.values(counts).reduce((s, c) => s + c, 0)
      return {
        id: rep.id,
        full_name: rep.fullName,
        phone: rep.phone,
        total_leads: total,
        interested_count: counts['interested'] ?? 0,
        not_interested_count: counts['not_interested'] ?? 0,
        pending_count: counts['pending'] ?? 0,
        deal_closed_count: counts['deal_closed'] ?? 0,
        missed_count: missedCountByRep.get(rep.id) ?? 0,
      }
    })

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
