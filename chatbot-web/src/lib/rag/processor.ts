import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import { chunkText } from '@/lib/rag/chunker';
import { generateEmbedding } from '@/lib/rag/embedder';

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractTextFromPlain(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

async function extractText(filePath: string, mimeType: string): Promise<string> {
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer);
  }
  if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromDocx(buffer);
  }
  return extractTextFromPlain(buffer);
}

export async function processDocument(documentId: string): Promise<void> {
  let doc;
  try
  {
    doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error(`Document ${documentId} not found`);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: doc.knowledgeBaseId } });
    const chunkSize = kb?.chunkSize ?? 1000;
    const chunkOverlap = kb?.chunkOverlap ?? 200;

    const text = await extractText(doc.storageUrl, doc.mimeType);
    if (!text.trim()) throw new Error('No text could be extracted from the file');

    const chunks = chunkText(text, chunkSize, chunkOverlap);

    await prisma.$transaction(
      chunks.map(chunk =>
        prisma.chunk.create({
          data: {
            documentId,
            index: chunk.index,
            content: chunk.content,
          },
        })
      )
    );

    for (const chunk of chunks) {
      try
      {
        const chunkRecord = await prisma.chunk.findFirst({ where: { documentId, index: chunk.index } });
        if (chunkRecord) {
          const embedding = await generateEmbedding(chunk.content);
          await prisma.$executeRawUnsafe(
            `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
            `[${embedding.join(',')}]`,
            chunkRecord.id
          );
        }
      } catch (err) {
        console.error(`Embedding failed for chunk ${chunk.index} of document ${documentId}:`, err);
      }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY', chunkCount: chunks.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Document processing failed for ${documentId}:`, message);
    try
    {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: message },
      });
    } catch (updateErr) {
      console.error(`Failed to update document ${documentId} to FAILED:`, updateErr);
    }
  }
}
