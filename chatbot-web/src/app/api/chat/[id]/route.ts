import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (body.type === 'edit-message') {
    const { messageId, content } = body as { type: 'edit-message'; messageId: string; content: string };

    await prisma.message.update({
      where: { id: messageId },
      data: { content, edited: true, editedAt: new Date() },
    });

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg && msg.conversationId === id) {
      await prisma.message.deleteMany({
        where: {
          conversationId: id,
          createdAt: { gt: msg.createdAt },
        },
      });
    }

    return NextResponse.json({ success: true });
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      title: body.title,
      pinned: body.pinned,
      archived: body.archived,
      folderId: body.folderId,
      model: body.model,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      topP: body.topP,
      maxTokens: body.maxTokens,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
