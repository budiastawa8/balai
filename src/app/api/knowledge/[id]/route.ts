import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { chunks, documents } from "@/db/schema";
import { indexDocument } from "@/lib/rag/index-document";
import { assertTenantAccess } from "@/lib/tenants";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const db = getDb();
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertTenantAccess(userId, doc.tenantId);
    await db.delete(chunks).where(eq(chunks.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "reindex") {
    return NextResponse.json(
      { error: 'action must be "reindex"' },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertTenantAccess(userId, doc.tenantId);

    if (!doc.content?.trim()) {
      return NextResponse.json(
        { error: "Document has no content to reindex. Upload again." },
        { status: 400 },
      );
    }

    await indexDocument(id);

    const [fresh] = await db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
        chunkCount: documents.chunkCount,
        errorMessage: documents.errorMessage,
      })
      .from(documents)
      .where(and(eq(documents.id, id)))
      .limit(1);

    return NextResponse.json({ document: fresh });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reindex failed";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
