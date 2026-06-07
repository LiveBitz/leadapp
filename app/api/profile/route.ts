import { NextRequest, NextResponse } from 'next/server'
import { getRepIdFromRequest } from '@/lib/repAuth'
import { getProfileById } from '@/lib/getProfile'

export async function GET(req: NextRequest) {
  try {
    const repId = await getRepIdFromRequest(req)
    if (!repId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getProfileById(repId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { passwordHash: _, ...safeProfile } = profile
    return NextResponse.json(safeProfile)
  } catch (error) {
    console.error('[GET /api/profile]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
