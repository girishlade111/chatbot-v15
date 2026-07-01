import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role === 'USER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [totalUsers, activeUsers, totalConversations, totalMessages, usageStats, modelStats, dailyStats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.usageLog.aggregate({
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
    }),
    prisma.usageLog.groupBy({
      by: ['model'],
      _sum: { tokensIn: true, tokensOut: true, costUsd: true },
      _count: { id: true },
      orderBy: { _sum: { costUsd: 'desc' } },
    }),
    prisma.usageLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, costUsd: true, tokensIn: true, tokensOut: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return NextResponse.json({
    overview: {
      totalUsers,
      activeUsersToday: activeUsers,
      totalConversations,
      totalMessages,
      totalTokensIn: usageStats._sum.tokensIn || 0,
      totalTokensOut: usageStats._sum.tokensOut || 0,
      totalCostUsd: usageStats._sum.costUsd || 0,
    },
    byModel: modelStats.map((m: any) => ({
      model: m.model,
      requests: m._count.id,
      tokensIn: m._sum.tokensIn || 0,
      tokensOut: m._sum.tokensOut || 0,
      costUsd: m._sum.costUsd || 0,
    })),
    dailyUsage: dailyStats,
  });
}
