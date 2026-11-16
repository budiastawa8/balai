import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { channelConfigs } from "@/db/schema";
import { getChannelAdapter } from "@/lib/channels/registry";
import { assertTenantAccess } from "@/lib/tenants";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      target?: string;
    };

    if (!body.tenantId || !body.target?.trim()) {
      return NextResponse.json(
        { error: "tenantId and target (nomor WA) are required" },
        { status: 400 },
      );
    }

    await assertTenantAccess(userId, body.tenantId);
    const db = getDb();
    const [config] = await db
      .select()
      .from(channelConfigs)
      .where(
        and(
          eq(channelConfigs.tenantId, body.tenantId),
          eq(channelConfigs.provider, "fonnte"),
        ),
      )
      .limit(1);

    if (!config?.credentials?.token) {
      return NextResponse.json(
        { error: "Simpan token Fonnte dulu di Channel." },
        { status: 400 },
      );
    }

    const adapter = getChannelAdapter("fonnte");
    if (!adapter) {
      return NextResponse.json({ error: "Adapter missing" }, { status: 500 });
    }

    const result = await adapter.sendMessage(
      {
        tenantId: body.tenantId,
        externalUserId: body.target.trim(),
        text: "Pesan uji dari BalAI. Jika Anda menerima ini, koneksi Fonnte berhasil.",
      },
      config.credentials,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test send failed";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
