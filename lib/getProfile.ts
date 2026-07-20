import { prismaD1 as prisma } from './prisma-d1'
import type { Profile } from '../node_modules/.prisma/client-d1'

export type { Profile }

export async function getProfileById(repId: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { id: repId } })
}
