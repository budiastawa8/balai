import type { ChannelAdapter, InboundMessage, OutboundMessage } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Fonnte WhatsApp adapter.
 * Docs: https://docs.fonnte.com/webhook-reply-message/
 */
export const fonnteAdapter: ChannelAdapter = {
  provider: "fonnte",

  parseInbound(payload, context): InboundMessage | null {
    if (!payload || typeof payload !== "object") return null;
    const body = payload as Record<string, unknown>;

    // Prefer chat text; fall back to button text.
    const text = asString(body.message) || asString(body.text);
    const externalUserId =
      asString(body.sender) || asString(body.phone) || asString(body.from);

    // Ignore empty / non-text events (status receipts, etc.)
    if (!text || !externalUserId) return null;

    return {
      provider: "fonnte",
      tenantId: context.tenantId,
      externalUserId,
      text,
      displayName: asString(body.name) || undefined,
      inboxId: asString(body.inboxid) || undefined,
      device: asString(body.device) || undefined,
      raw: payload,
    };
  },

  async sendMessage(message: OutboundMessage, credentials) {
    const token = credentials.token || process.env.FONNTE_TOKEN;
    if (!token) {
      return {
        ok: false,
        error:
          "Fonnte token missing. Simpan token di Channel atau set FONNTE_TOKEN.",
      };
    }

    const payload: Record<string, string> = {
      target: message.externalUserId,
      message: message.text.slice(0, 60000),
    };

    if (message.inboxId) payload.inboxid = message.inboxId;
    const device = credentials.device || process.env.FONNTE_DEVICE;
    if (device) payload.device = device;

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let data: { status?: boolean; id?: string | number; reason?: string } = {};
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      // keep raw text for errors
    }

    if (!response.ok || data.status === false) {
      return {
        ok: false,
        error:
          data.reason ||
          `Fonnte HTTP ${response.status}: ${raw.slice(0, 300)}`,
      };
    }

    return {
      ok: true,
      providerMessageId: data.id != null ? String(data.id) : undefined,
    };
  },
};
