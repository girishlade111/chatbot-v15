import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayUsage, totalUsage, recentLogs] = await Promise.all([
    prisma.usageLog.aggregate({
      where: { userId: session.user.id, createdAt: { gte: today } },
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    }),
    prisma.usageLog.aggregate({
      where: { userId: session.user.id },
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    }),
    prisma.usageLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { model: true, tokensIn: true, tokensOut: true, costUsd: true, createdAt: true, status: true },
    }),
  ]);

  return NextResponse.json({
    today: {
      tokensIn: todayUsage._sum.tokensIn || 0,
      tokensOut: todayUsage._sum.tokensOut || 0,
      costUsd: todayUsage._sum.costUsd || 0,
    },
    total: {
      tokensIn: totalUsage._sum.tokensIn || 0,
      tokensOut: totalUsage._sum.tokensOut || 0,
      costUsd: totalUsage._sum.costUsd || 0,
    },
    recent: recentLogs,
  });
}
