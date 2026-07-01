import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { userId: session.user.id },
    include: { documents: { orderBy: { createdAt: 'desc' }, take: 20 } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ knowledgeBases });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const kb = await prisma.knowledgeBase.create({
    data: {
      userId: session.user.id,
      name: body.name,
      description: body.description,
      chunkSize: body.chunkSize || 1000,
      chunkOverlap: body.chunkOverlap || 200,
    },
  });

  return NextResponse.json(kb, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Knowledge base ID required' }, { status: 400 });

  const kb = await prisma.knowledgeBase.findUnique({ where: { id } });
  if (!kb || kb.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.knowledgeBase.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
