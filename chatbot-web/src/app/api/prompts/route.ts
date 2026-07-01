import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showPublic = searchParams.get('public') === 'true';

  const templates = await prisma.promptTemplate.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        ...(showPublic ? [{ isPublic: true }] : []),
      ],
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, content, model, isPublic, tags } = body;

  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
  }

  const template = await prisma.promptTemplate.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      content: content.trim(),
      model: model || null,
      isPublic: !!isPublic,
      tags: Array.isArray(tags) ? tags : [],
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, content, model, isPublic, tags, usageCount } = body;

  const template = await prisma.promptTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(model !== undefined ? { model: model || null } : {}),
      ...(isPublic !== undefined ? { isPublic: !!isPublic } : {}),
      ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
      ...(usageCount !== undefined ? { usageCount } : {}),
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.promptTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
