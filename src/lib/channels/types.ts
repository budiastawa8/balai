export type ChannelProvider =
  | "web"
  | "fonnte"
  | "meta_cloud"
  | "telegram"
  | "instagram"
  | "messenger"
  | "email";

export type InboundMessage = {
  provider: ChannelProvider;
  tenantId: string;
  externalUserId: string;
  text: string;
  displayName?: string;
  inboxId?: string;
  device?: string;
  raw?: unknown;
};

export type OutboundMessage = {
  tenantId: string;
  externalUserId: string;
  text: string;
  inboxId?: string;
};

export type ChannelAdapter = {
  provider: ChannelProvider;
  /** Normalize provider webhook payload into a common inbound shape. */
  parseInbound: (
    payload: unknown,
    context: { tenantId: string },
  ) => InboundMessage | null;
  /** Send a reply through the provider API. */
  sendMessage: (
    message: OutboundMessage,
    credentials: Record<string, string>,
  ) => Promise<{ ok: boolean; providerMessageId?: string; error?: string }>;
};
