import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id, archived: false },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, title: true, model: true, pinned: true, tokenCount: true, createdAt: true, updatedAt: true, folderId: true },
    take: 100,
  });

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ conversations, folders });
}
