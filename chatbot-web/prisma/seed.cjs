const { PrismaLibSql } = require('@prisma/adapter-libsql')
const { PrismaClient } = require('../src/generated/client.js')
const crypto = require('node:crypto')

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function main() {
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
}

main().catch(console.error)
