import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { extractTextFromPdf } from "@/lib/rag/extract-pdf";
import { indexDocument } from "@/lib/rag/index-document";
import { assertTenantAccess } from "@/lib/tenants";

async function extractTextFromFile(
  file: File,
): Promise<{ text: string; sourceType: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPdf(buffer);
    return { text, sourceType: "pdf" };
  }

  const text = await file.text();
  if (name.endsWith(".md")) return { text, sourceType: "markdown" };
  return { text, sourceType: "text" };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let tenantId = "";
    let title = "";
    let content = "";
    let sourceType = "text";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      tenantId = String(form.get("tenantId") || "");
      title = String(form.get("title") || "");
      const file = form.get("file");
      const pasted = form.get("content");

      if (file instanceof File && file.size > 0) {
        const extracted = await extractTextFromFile(file);
        content = extracted.text;
        sourceType = extracted.sourceType;
        if (!title) title = file.name;
      } else if (typeof pasted === "string") {
        content = pasted;
        sourceType = "text";
      }
    } else {
      const body = (await request.json()) as {
        tenantId?: string;
        title?: string;
        content?: string;
      };
      tenantId = body.tenantId || "";
      title = body.title || "";
      content = body.content || "";
    }

    if (!tenantId || !title.trim() || !content.trim()) {
      return NextResponse.json(
        { error: "tenantId, title, and content are required" },
        { status: 400 },
      );
    }

    await assertTenantAccess(userId, tenantId);
    const db = getDb();
    const [doc] = await db
      .insert(documents)
      .values({
        tenantId,
        title: title.trim(),
        content: content.trim(),
        sourceType,
        status: "pending",
      })
      .returning();

    await indexDocument(doc.id);

    const [result] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, doc.id))
      .limit(1);

    return NextResponse.json({ document: result ?? doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
