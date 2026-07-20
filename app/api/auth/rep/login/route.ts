import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prismaD1 as prisma } from '@/lib/prisma-d1'
import { createRepToken } from '@/lib/repAuth'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = (await req.json()) as {
      phone?: string
      password?: string
    }

    if (!phone?.trim() || !password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({
      where: { phone: phone.trim() },
    })

    if (!profile || !profile.passwordHash) {
      // Same message — no enumeration of valid phone numbers
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, profile.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 })
    }

    const token = await createRepToken(profile.id)

    // Return token + profile (without the password hash)
    const { passwordHash: _, ...safeProfile } = profile
    return NextResponse.json({ token, profile: safeProfile })
  } catch (error) {
    console.error('[POST /api/auth/rep/login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
