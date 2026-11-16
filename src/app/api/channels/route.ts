import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { channelConfigs } from "@/db/schema";
import { CHANNEL_ROADMAP } from "@/lib/channels/registry";
import { assertTenantAccess } from "@/lib/tenants";

function absoluteWebhook(request: Request, tenantId: string) {
  const path = `/api/webhooks/fonnte/${tenantId}`;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${path}`;

  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) return `${proto}://${host}${path}`;
  return path;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    await assertTenantAccess(userId, tenantId);
    const db = getDb();
    const configs = await db
      .select({
        id: channelConfigs.id,
        provider: channelConfigs.provider,
        enabled: channelConfigs.enabled,
        credentials: channelConfigs.credentials,
        metadata: channelConfigs.metadata,
        updatedAt: channelConfigs.updatedAt,
      })
      .from(channelConfigs)
      .where(eq(channelConfigs.tenantId, tenantId));

    const fonnte = configs.find((c) => c.provider === "fonnte");

    return NextResponse.json({
      roadmap: CHANNEL_ROADMAP,
      configs: configs.map(({ credentials: _c, ...rest }) => rest),
      webhookUrl: absoluteWebhook(request, tenantId),
      webhookPath: `/api/webhooks/fonnte/${tenantId}`,
      fonnte: fonnte
        ? {
            enabled: fonnte.enabled === 1,
            hasToken: Boolean(fonnte.credentials?.token),
            device: fonnte.credentials?.device || "",
            updatedAt: fonnte.updatedAt,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load channels";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      provider?: string;
      token?: string;
      device?: string;
      enabled?: boolean;
    };

    if (!body.tenantId || !body.provider) {
      return NextResponse.json(
        { error: "tenantId and provider are required" },
        { status: 400 },
      );
    }

    await assertTenantAccess(userId, body.tenantId);
    const db = getDb();

    const existing = await db
      .select()
      .from(channelConfigs)
      .where(eq(channelConfigs.tenantId, body.tenantId));
    const current = existing.find((c) => c.provider === body.provider);

    const credentials = {
      ...(current?.credentials ?? {}),
      ...(body.token ? { token: body.token } : {}),
      ...(body.device !== undefined ? { device: body.device } : {}),
    };

    const [saved] = await db
      .insert(channelConfigs)
      .values({
        tenantId: body.tenantId,
        provider: body.provider,
        enabled: body.enabled === false ? 0 : 1,
        credentials,
        metadata: {},
      })
      .onConflictDoUpdate({
        target: [channelConfigs.tenantId, channelConfigs.provider],
        set: {
          enabled: body.enabled === false ? 0 : 1,
          credentials,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      config: {
        id: saved.id,
        provider: saved.provider,
        enabled: saved.enabled,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save channel";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
