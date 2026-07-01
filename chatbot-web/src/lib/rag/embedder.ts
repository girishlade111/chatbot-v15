import { embed as aiEmbed } from 'ai';
import { openai } from '@ai-sdk/openai';

const embeddingModel = openai.embedding('text-embedding-3-small');

export interface EmbeddingResult {
  content: string;
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await aiEmbed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(chunks: { index: number; content: string }[]): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);
    results.push({ content: chunk.content, embedding });
  }

  return results;
}
