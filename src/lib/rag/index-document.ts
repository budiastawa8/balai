import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chunks, documents } from "@/db/schema";
import { chunkText } from "./chunk";
import { embedTexts } from "./embed";

export async function indexDocument(documentId: string): Promise<void> {
  const db = getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new Error(`Document ${documentId} not found`);
  }

  await db
    .update(documents)
    .set({ status: "indexing", errorMessage: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  try {
    await db.delete(chunks).where(eq(chunks.documentId, documentId));

    const parts = chunkText(doc.content);
    if (parts.length === 0) {
      await db
        .update(documents)
        .set({
          status: "ready",
          chunkCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      return;
    }

    const embeddings = await embedTexts(parts.map((p) => p.content));

    await db.insert(chunks).values(
      parts.map((part, i) => ({
        tenantId: doc.tenantId,
        documentId: doc.id,
        content: part.content,
        tokenCount: part.tokenCount,
        embedding: embeddings[i],
        metadata: { title: doc.title },
      })),
    );

    await db
      .update(documents)
      .set({
        status: "ready",
        chunkCount: parts.length,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexing failed";
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    throw error;
  }
}
