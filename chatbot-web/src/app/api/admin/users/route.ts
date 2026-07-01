import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role === 'USER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true, credits: true, totalTokens: true,
      banned: true, bannedReason: true, createdAt: true,
      _count: { select: { conversations: true, usageLogs: true } },
    },
    take: 100,
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role === 'USER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, action, value } = body;

  if (!userId || !action) return NextResponse.json({ error: 'userId and action required' }, { status: 400 });

  const updateData: Record<string, unknown> = {};
  switch (action) {
    case 'ban':
      updateData.banned = true;
      updateData.bannedReason = value || 'Banned by admin';
      break;
    case 'unban':
      updateData.banned = false;
      updateData.bannedReason = null;
      break;
    case 'setCredits':
      updateData.credits = parseInt(value, 10);
      break;
    case 'setRole':
      updateData.role = value;
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });
  return NextResponse.json({ success: true });
}
