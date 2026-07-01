export interface ChunkResult {
  index: number;
  content: string;
}

export function chunkText(text: string, size: number = 1000, overlap: number = 200): ChunkResult[] {
  if (!text || text.length <= size) return [{ index: 0, content: text }];

  const chunks: ChunkResult[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);

    if (end < text.length) {
      const breakChars = ['\n\n', '\n', '. ', '! ', '? ', ' '];
      for (const bc of breakChars) {
        const idx = text.lastIndexOf(bc, end);
        if (idx > i + size * 0.5) {
          end = idx + bc.length;
          break;
        }
      }
    }

    chunks.push({ index: chunks.length, content: text.slice(i, end) });
    i = end - overlap;
    if (i < 0) i = 0;
  }

  return chunks;
}

export function chunkByTokens(text: string, maxTokens: number = 500): ChunkResult[] {
  const words = text.split(/\s+/);
  const chunks: ChunkResult[] = [];
  const TOKENS_PER_WORD = 1.3;

  let i = 0;
  while (i < words.length) {
    const wordsPerChunk = Math.floor(maxTokens / TOKENS_PER_WORD);
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    chunks.push({ index: chunks.length, content: chunk });
    i += Math.floor(wordsPerChunk * 0.8);
  }

  return chunks;
}
