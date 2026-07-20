import { PrismaClient } from '../node_modules/.prisma/client-d1'
import { PrismaD1 } from '@prisma/adapter-d1'

declare global {
  // eslint-disable-next-line no-var
  var prismaD1: PrismaClient | undefined
}

function createPrismaD1Client() {
  const adapter = new PrismaD1({
    CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN!,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_DATABASE_ID: process.env.CLOUDFLARE_DATABASE_ID!,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Reuse the client across hot-reloads in development to avoid exhausting connections.
// Named prismaD1 (not prisma) so this can exist alongside lib/prisma.ts (Neon) during
// the parallel-run / verification phase without any import collision.
export const prismaD1 = global.prismaD1 ?? createPrismaD1Client()

if (process.env.NODE_ENV !== 'production') {
  global.prismaD1 = prismaD1
}
