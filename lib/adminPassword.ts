import { timingSafeEqual } from 'crypto'

export function checkAdminPassword(provided: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}
