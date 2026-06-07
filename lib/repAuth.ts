import { SignJWT, jwtVerify } from 'jose'
import { type NextRequest } from 'next/server'

const EXPIRY = '30d'

function getSecret() {
  const s = process.env.REP_JWT_SECRET
  if (!s) throw new Error('REP_JWT_SECRET is not set')
  return new TextEncoder().encode(s)
}

export async function createRepToken(repId: string): Promise<string> {
  return new SignJWT({ repId, role: 'rep' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyRepToken(token: string): Promise<{ repId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { repId: payload.repId as string }
  } catch {
    return null
  }
}

export async function getRepIdFromRequest(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  const result = await verifyRepToken(header.slice(7))
  return result?.repId ?? null
}
