const { PrismaClient } = require('@/generated/client');
type PrismaClientType = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType | undefined };

export const prisma: PrismaClientType = globalForPrisma.prisma ?? new PrismaClient({});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;