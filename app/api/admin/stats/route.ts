import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/session'

export async function GET() {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Last 7 days (start of day UTC)
    const days: { date: string; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setUTCHours(0, 0, 0, 0)
      d.setUTCDate(d.getUTCDate() - i)
      const label =
        i === 0 ? 'Today' :
        i === 1 ? 'Yesterday' :
        d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      days.push({ date: d.toISOString(), label })
    }

    const since = new Date(days[0].date)

    // Fetch all leads created in the last 7 days
    const leads = await prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, direction: true, status: true },
    })

    // Group into daily buckets
    const daily = days.map(({ date, label }) => {
      const dayStart = new Date(date)
      const dayEnd = new Date(dayStart)
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

      const dayLeads = leads.filter(
        (l) => l.createdAt >= dayStart && l.createdAt < dayEnd,
      )

      return {
        label,
        total: dayLeads.length,
        incoming: dayLeads.filter((l) => l.direction === 'incoming').length,
        outgoing: dayLeads.filter((l) => l.direction === 'outgoing').length,
        interested: dayLeads.filter((l) => l.status === 'interested').length,
        not_interested: dayLeads.filter((l) => l.status === 'not_interested').length,
        pending: dayLeads.filter((l) => l.status === 'pending').length,
      }
    })

    // Overall summary
    const allLeads = await prisma.lead.findMany({
      select: { status: true, direction: true },
    })

    const summary = {
      total: allLeads.length,
      incoming: allLeads.filter((l) => l.direction === 'incoming').length,
      outgoing: allLeads.filter((l) => l.direction === 'outgoing').length,
      interested: allLeads.filter((l) => l.status === 'interested').length,
      not_interested: allLeads.filter((l) => l.status === 'not_interested').length,
      pending: allLeads.filter((l) => l.status === 'pending').length,
      today: daily[6].total,
    }

    return NextResponse.json({ daily, summary })
  } catch (error) {
    console.error('[GET /api/admin/stats]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
