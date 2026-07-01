const { PrismaClient } = require('@/generated/client') as typeof import('@prisma/client');

const globalForPrisma = globalThis as unknown as { prisma: typeof import('@prisma/client').PrismaClient };

export const prisma = (globalForPrisma.prisma ?? new PrismaClient()) as any;
