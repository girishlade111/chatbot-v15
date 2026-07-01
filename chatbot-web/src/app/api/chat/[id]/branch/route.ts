import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { forkMessageId } = await req.json();

  const parent = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!parent || parent.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const forkIndex = parent.messages.findIndex((m: { id: string; role: string; content: string; tokensIn?: number | null; tokensOut?: number | null; latencyMs?: number | null; createdAt: Date; }) => m.id === forkMessageId);
  if (forkIndex === -1) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const messagesToCopy = parent.messages.slice(0, forkIndex + 1);

  const branch = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title: parent.title,
      model: parent.model,
      temperature: parent.temperature,
      topP: parent.topP,
      maxTokens: parent.maxTokens,
      systemPrompt: parent.systemPrompt ?? undefined,
      parentId: id,
      tokenCount: 0,
      messages: {
        create: messagesToCopy.map((m: { id: string; role: string; content: string; tokensIn?: number | null; tokensOut?: number | null; latencyMs?: number | null; createdAt: Date; }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tokensIn: m.tokensIn ?? undefined,
          tokensOut: m.tokensOut ?? undefined,
          latencyMs: m.latencyMs ?? undefined,
          createdAt: m.createdAt,
        })),
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  return NextResponse.json(branch);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (!branchId) {
    return NextResponse.json({ error: 'branchId query param required' }, { status: 400 });
  }

  const branch = await prisma.conversation.findUnique({ where: { id: branchId } });
  if (!branch || branch.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: branchId } });
  return NextResponse.json({ success: true });
}
