import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRepIdFromRequest } from '@/lib/repAuth'

// Normalize to last 10 digits — tolerates country code differences (+1, 0, etc.)
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10)
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
      direction?: 'incoming' | 'outgoing' | 'missed'
    }

    const rawPhone = phone?.trim()
    if (!rawPhone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    const normalized = normalizePhone(rawPhone)
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const normalizedDirection: 'incoming' | 'outgoing' | 'missed' =
      direction === 'incoming' || direction === 'missed' ? direction : 'outgoing'

    // Single indexed lookup — hits (repId, phoneNormalized) compound index
    const duplicate = await prisma.lead.findFirst({
      where: { repId, phoneNormalized: normalized },
    })

    if (duplicate) {
      // A number that was first captured as a missed call and later actually
      // connects (rep calls back, or the contact calls again and it's answered)
      // should stop reading as "Missed" — it no longer accurately describes the
      // relationship. A real connection always wins over a missed one; we never
      // downgrade an already-connected lead back to "missed" from a later
      // unanswered call, since that would erase the fact a conversation happened.
      if (duplicate.direction === 'missed' && normalizedDirection !== 'missed') {
        const updated = await prisma.lead.update({
          where: { id: duplicate.id },
          data: { direction: normalizedDirection },
        })
        return NextResponse.json({ lead: updated, created: false })
      }
      return NextResponse.json({ lead: duplicate, created: false })
    }

    const lead = await prisma.lead.create({
      data: {
        name:           rawPhone,
        phone:          rawPhone,
        phoneNormalized: normalized,
        repId,
        status:         'pending',
        notes:          '',
        direction:      normalizedDirection,
      },
    })

    return NextResponse.json({ lead, created: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/leads/capture]', error)
    return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 })
  }
}
