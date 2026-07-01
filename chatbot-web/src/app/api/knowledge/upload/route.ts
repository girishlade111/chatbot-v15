import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/utils/rate-limiter';
import { processDocument } from '@/lib/rag/processor';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.csv', '.md'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const rateLimit = await checkRateLimit(`upload:${userId}`, 10, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const knowledgeBaseId = formData.get('knowledgeBaseId') as string | null;

  if (!file || !knowledgeBaseId) {
    return NextResponse.json({ error: 'File and knowledgeBaseId are required' }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `File type "${ext}" is not supported. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }

  const kb = await prisma.knowledgeBase.findUnique({ where: { id: knowledgeBaseId } });
  if (!kb) {
    return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
  }
  if (kb.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const mimeType = file.type || 'application/octet-stream';
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadDir = path.join(process.cwd(), 'uploads');
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(uploadDir, safeName);

  try
  {
    const { mkdir } = await import('fs/promises');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);
  } catch (err) {
    console.error('Failed to save file:', err);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      knowledgeBaseId,
      filename: safeName,
      originalName: file.name,
      mimeType,
      sizeBytes: file.size,
      storageUrl: filePath,
      status: 'PENDING',
    },
  });

  processDocument(doc.id).catch(err => {
    console.error(`Document processing failed for ${doc.id}:`, err);
  });

  return NextResponse.json(
    { id: doc.id, status: doc.status },
    { status: 201 },
  );
}
