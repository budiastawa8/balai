import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { channelConfigs, conversations, messages, tenants } from "@/db/schema";
import { getChannelAdapter } from "@/lib/channels/registry";
import { answerFromKnowledge } from "@/lib/rag/answer";

type RouteContext = { params: Promise<{ tenantId: string }> };

/**
 * Public webhook for Fonnte inbound WhatsApp messages.
 * Set in Fonnte device settings (turn Autoread ON).
 */
export async function POST(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  const adapter = getChannelAdapter("fonnte");
  if (!adapter) {
    return NextResponse.json({ error: "Fonnte adapter missing" }, { status: 500 });
  }

  try {
    const db = getDb();
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [config] = await db
      .select()
      .from(channelConfigs)
      .where(
        and(
          eq(channelConfigs.tenantId, tenantId),
          eq(channelConfigs.provider, "fonnte"),
        ),
      )
      .limit(1);

    if (config && config.enabled === 0) {
      return NextResponse.json({ ok: true, ignored: true, reason: "disabled" });
    }

    const payload = await request.json().catch(() => null);
    const inbound = adapter.parseInbound(payload, { tenantId });
    if (!inbound) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, tenantId),
          eq(conversations.channel, "fonnte"),
          eq(conversations.externalUserId, inbound.externalUserId),
        ),
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(1);

    const conversation =
      existing ??
      (
        await db
          .insert(conversations)
          .values({
            tenantId,
            channel: "fonnte",
            externalUserId: inbound.externalUserId,
            title:
              inbound.displayName ||
              inbound.text.slice(0, 80) ||
              inbound.externalUserId,
          })
          .returning()
      )[0];

    await db.insert(messages).values({
      conversationId: conversation.id,
      tenantId,
      role: "user",
      content: inbound.text,
    });

    const historyRows = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(asc(messages.createdAt));

    const history = historyRows
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(0, -1)
      .slice(-8)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const result = await answerFromKnowledge({
      tenantId,
      question: inbound.text,
      systemPrompt: tenant.systemPrompt,
      history,
    });

    await db.insert(messages).values({
      conversationId: conversation.id,
      tenantId,
      role: "assistant",
      content: result.answer,
      citations: result.citations,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    const credentials = {
      ...(config?.credentials ?? {}),
      ...(inbound.device && !(config?.credentials?.device)
        ? { device: inbound.device }
        : {}),
    };

    const sendResult = await adapter.sendMessage(
      {
        tenantId,
        externalUserId: inbound.externalUserId,
        text: result.answer,
        inboxId: inbound.inboxId,
      },
      credentials,
    );

    return NextResponse.json({
      ok: true,
      conversationId: conversation.id,
      sent: sendResult.ok,
      sendError: sendResult.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    console.error("[fonnte webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Fonnte sometimes probes the webhook URL. */
export async function GET(_request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  return NextResponse.json({
    ok: true,
    provider: "fonnte",
    tenantId,
    message: "BalAI Fonnte webhook is ready. Use POST for incoming messages.",
  });
}
