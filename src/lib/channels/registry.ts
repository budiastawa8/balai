import { fonnteAdapter } from "./fonnte";
import type { ChannelAdapter, ChannelProvider } from "./types";

const adapters: Partial<Record<ChannelProvider, ChannelAdapter>> = {
  fonnte: fonnteAdapter,
};

export function getChannelAdapter(
  provider: ChannelProvider,
): ChannelAdapter | null {
  return adapters[provider] ?? null;
}

export function listChannelProviders(): ChannelProvider[] {
  return Object.keys(adapters) as ChannelProvider[];
}

export const CHANNEL_ROADMAP: Array<{
  provider: ChannelProvider;
  label: string;
  status: "live" | "planned";
}> = [
  { provider: "fonnte", label: "WhatsApp (Fonnte)", status: "live" },
  { provider: "meta_cloud", label: "WhatsApp Cloud API", status: "planned" },
  { provider: "telegram", label: "Telegram", status: "planned" },
  { provider: "instagram", label: "Instagram", status: "planned" },
  { provider: "messenger", label: "Messenger", status: "planned" },
  { provider: "email", label: "Email / helpdesk", status: "planned" },
];
