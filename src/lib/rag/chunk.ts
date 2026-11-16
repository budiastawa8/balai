export type TextChunk = {
  content: string;
  tokenCount: number;
};

/** Rough token estimate (~4 chars/token) for chunk sizing. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Split text into overlapping chunks suitable for embedding.
 */
export function chunkText(
  text: string,
  opts: { maxTokens?: number; overlapTokens?: number } = {},
): TextChunk[] {
  const maxTokens = opts.maxTokens ?? 500;
  const overlapTokens = opts.overlapTokens ?? 80;
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: TextChunk[] = [];
  let buffer = "";

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    chunks.push({ content, tokenCount: estimateTokens(content) });
  };

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (estimateTokens(candidate) <= maxTokens) {
      buffer = candidate;
      continue;
    }

    if (buffer) flush();

    if (estimateTokens(para) <= maxTokens) {
      buffer = para;
      continue;
    }

    // Hard-split long paragraphs by character window with overlap.
    let start = 0;
    while (start < para.length) {
      const end = Math.min(para.length, start + maxChars);
      const slice = para.slice(start, end).trim();
      if (slice) {
        chunks.push({ content: slice, tokenCount: estimateTokens(slice) });
      }
      if (end >= para.length) break;
      start = Math.max(0, end - overlapChars);
    }
    buffer = "";
  }

  flush();
  return chunks;
}
