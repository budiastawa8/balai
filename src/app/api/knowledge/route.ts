import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { assertTenantAccess } from "@/lib/tenants";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    await assertTenantAccess(userId, tenantId);
    const db = getDb();
    const rows = await db
      .select({
        id: documents.id,
        title: documents.title,
        sourceType: documents.sourceType,
        status: documents.status,
        chunkCount: documents.chunkCount,
        errorMessage: documents.errorMessage,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({ documents: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list knowledge";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
