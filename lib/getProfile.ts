import { prisma } from './prisma'
import type { Profile } from '@prisma/client'

export type { Profile }

export async function getProfileById(repId: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { id: repId } })
}
