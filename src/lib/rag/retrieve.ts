import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { chunks } from "@/db/schema";
import { embedQuery } from "./embed";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  content: string;
  score: number;
};

export async function retrieveRelevantChunks(
  tenantId: string,
  query: string,
  opts: { limit?: number; minScore?: number } = {},
): Promise<RetrievedChunk[]> {
  const limit = opts.limit ?? 6;
  const minScore = opts.minScore ?? 0.25;
  const queryEmbedding = await embedQuery(query);
  const db = getDb();

  const distance = cosineDistance(chunks.embedding, queryEmbedding);
  const similarity = sql<number>`1 - (${distance})`;

  const rows = await db
    .select({
      id: chunks.id,
      documentId: chunks.documentId,
      content: chunks.content,
      score: similarity,
    })
    .from(chunks)
    .where(and(eq(chunks.tenantId, tenantId), gt(similarity, minScore)))
    .orderBy(desc(similarity))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    content: row.content,
    score: Number(row.score),
  }));
}
