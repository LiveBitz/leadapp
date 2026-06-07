import { defineConfig } from 'prisma/config'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Load .env.local so prisma CLI has access to DIRECT_URL
loadEnv({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // DIRECT_URL (non-pooled) is required for prisma db push / migrate
    url: process.env.DIRECT_URL,
  },
})
