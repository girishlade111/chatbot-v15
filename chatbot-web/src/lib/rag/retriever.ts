import { generateEmbedding } from './embedder';
import { prisma } from '@/lib/db/prisma';

export interface RetrievedChunk {
  content: string;
  documentName: string;
  score: number;
  chunkIndex: number;
}

export async function retrieveRelevantChunks(
  query: string,
  knowledgeBaseIds: string[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRaw<Array<{
    content: string;
    document_name: string;
    chunk_index: number;
    distance: number;
  }>>`
    SELECT
      c.content,
      d.original_name as document_name,
      c.index as chunk_index,
      c.embedding <-> ${embeddingStr}::vector as distance
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
    WHERE kb.id = ANY(${knowledgeBaseIds}::uuid[])
    AND c.embedding IS NOT NULL
    ORDER BY distance
    LIMIT ${topK}
  `;

  return results.map(r => ({
    content: r.content,
    documentName: r.document_name,
    score: 1 - r.distance,
    chunkIndex: r.chunk_index,
  }));
}

export async function buildRagContext(query: string, knowledgeBaseIds: string[]): Promise<string> {
  if (!knowledgeBaseIds.length) return '';

  const chunks = await retrieveRelevantChunks(query, knowledgeBaseIds);

  if (!chunks.length) return '';

  const context = chunks
    .map(c => `[Source: ${c.documentName} (relevance: ${(c.score * 100).toFixed(0)}%)]\n${c.content}`)
    .join('\n\n---\n\n');

  return `## Retrieved Knowledge Context\n\n${context}\n\nUse the above context to answer the user's question when relevant. If the context doesn't contain helpful information, rely on your own knowledge.`;
}
