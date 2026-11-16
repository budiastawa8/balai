import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { documents } from "../src/db/schema";
import { indexDocument } from "../src/lib/rag/index-document";

config({ path: ".env.local", override: true });

async function main() {
  const db = getDb();
  const failed = await db
    .select({
      id: documents.id,
      title: documents.title,
      errorMessage: documents.errorMessage,
    })
    .from(documents)
    .where(eq(documents.status, "failed"));

  if (failed.length === 0) {
    console.log("no_failed_documents");
    return;
  }

  for (const doc of failed) {
    console.log("reindexing", doc.id, doc.title);
    try {
      await indexDocument(doc.id);
      const [fresh] = await db
        .select({
          status: documents.status,
          chunkCount: documents.chunkCount,
          errorMessage: documents.errorMessage,
        })
        .from(documents)
        .where(eq(documents.id, doc.id))
        .limit(1);
      console.log(
        "done",
        doc.id,
        "status=" + fresh?.status,
        "chunks=" + fresh?.chunkCount,
        fresh?.errorMessage ? "error=" + fresh.errorMessage : "",
      );
    } catch (error) {
      console.error(
        "fail",
        doc.id,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
