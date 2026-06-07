import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRepIdFromRequest } from '@/lib/repAuth'

/** Strip all non-digit characters for loose phone matching. */
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Two numbers match if their digit-only strings are equal,
 * or one ends with the other (handles country code differences).
 */
function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhone(a)
  const right = normalizePhone(b)
  if (!left || !right) return false
  return left === right || left.endsWith(right) || right.endsWith(left)
}

export async function POST(req: NextRequest) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, calledAt, duration, direction } = (await req.json()) as {
      phone?: string
      calledAt?: number
      duration?: number
      direction?: 'incoming' | 'outgoing'
    }

    const rawPhone = phone?.trim()
    if (!rawPhone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    const normalised = normalizePhone(rawPhone)
    if (!normalised) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Fetch all leads for this rep so we can do a loose phone match.
    // For large datasets this should be replaced with a DB-level normalisation.
    const repLeads = await prisma.lead.findMany({
      where: { repId },
      select: { id: true, phone: true },
    })

    const duplicate = repLeads.find((l) => phonesMatch(l.phone, rawPhone))

    if (duplicate) {
      const existing = await prisma.lead.findUnique({ where: { id: duplicate.id } })
      return NextResponse.json({ lead: existing, created: false })
    }

    const lead = await prisma.lead.create({
      data: {
        name: rawPhone,
        phone: rawPhone,
        repId,
        status: 'pending',
        notes: '',
        direction: direction === 'incoming' ? 'incoming' : 'outgoing',
      },
    })

    return NextResponse.json({ lead, created: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/leads/capture]', error)
    return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 })
  }
}
