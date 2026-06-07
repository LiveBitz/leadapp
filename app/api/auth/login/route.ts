import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPassword } from '@/lib/adminPassword'
import { createSessionToken, setSessionCookie } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { password } = (await req.json()) as { password?: string }

    if (!password || !checkAdminPassword(password)) {
      // Same message for wrong password and missing password — no enumeration
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createSessionToken()
    const response = NextResponse.json({ success: true })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
