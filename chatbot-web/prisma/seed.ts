import { PrismaClient } from '@/generated/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import type { Config } from '@libsql/client'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function main() {
  const config = { url: process.env.SQLITE_URL ?? 'file:./dev.db' } satisfies Config
  const adapter = new PrismaLibSql(config)
  const prisma = new PrismaClient({ adapter })

  const email = 'test@example.com'
  const password = 'password123'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('User already exists:', email)
    await prisma.$disconnect()
    return
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      name: 'Test User',
      role: 'admin',
      credits: 10000,
    },
  })

  console.log('Created test user:', email, '/', password)
  await prisma.$disconnect()
}

main().catch(console.error)
