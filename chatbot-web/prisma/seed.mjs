import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../src/generated/client.js'
import crypto from 'node:crypto'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const config = { url: process.env.SQLITE_URL || 'file:./dev.db' }
const adapter = new PrismaLibSql(config)
const prisma = new PrismaClient({ adapter })

const email = 'test@example.com'
const password = 'password123'

const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  console.log('User already exists:', email)
} else {
  await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), name: 'Test User', role: 'admin', credits: 10000 },
  })
  console.log('Created test user:', email, '/', password)
}

await prisma.$disconnect()
