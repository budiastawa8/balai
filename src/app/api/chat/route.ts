import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { conversations, messages, tenants } from "@/db/schema";
import { answerFromKnowledge } from "@/lib/rag/answer";
import { assertTenantAccess } from "@/lib/tenants";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      message?: string;
      conversationId?: string;
    };

    const tenantId = body.tenantId?.trim();
    const message = body.message?.trim();
    if (!tenantId || !message) {
      return NextResponse.json(
        { error: "tenantId and message are required" },
        { status: 400 },
      );
    }

    await assertTenantAccess(userId, tenantId);
    const db = getDb();

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let conversationId = body.conversationId;
    if (conversationId) {
      const [existing] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      if (!existing || existing.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 },
        );
      }
    } else {
      const [created] = await db
        .insert(conversations)
        .values({
          tenantId,
          channel: "web",
          externalUserId: userId,
          title: message.slice(0, 80),
        })
        .returning();
      conversationId = created.id;
    }

    await db.insert(messages).values({
      conversationId,
      tenantId,
      role: "user",
      content: message,
    });

    const historyRows = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    const history = historyRows
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(0, -1)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const result = await answerFromKnowledge({
      tenantId,
      question: message,
      systemPrompt: tenant.systemPrompt,
      history,
    });

    const [assistantMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        tenantId,
        role: "assistant",
        content: result.answer,
        citations: result.citations,
      })
      .returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return NextResponse.json({
      conversationId,
      message: assistantMessage,
      citations: result.citations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
