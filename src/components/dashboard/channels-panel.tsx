"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RoadmapItem = {
  provider: string;
  label: string;
  status: string;
};

type FonnteState = {
  enabled: boolean;
  hasToken: boolean;
  device: string;
  updatedAt?: string;
} | null;

export function ChannelsPanel({ tenantId }: { tenantId: string }) {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [token, setToken] = useState("");
  const [device, setDevice] = useState("");
  const [testTarget, setTestTarget] = useState("");
  const [fonnte, setFonnte] = useState<FonnteState>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/channels?tenantId=${tenantId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memuat channel");
    setRoadmap(data.roadmap || []);
    setWebhookUrl(data.webhookUrl || data.webhookExample || "");
    setFonnte(data.fonnte);
    if (data.fonnte?.device) setDevice(data.fonnte.device);
  }, [tenantId]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Gagal memuat"),
    );
  }, [load]);

  async function saveFonnte() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          provider: "fonnte",
          token: token || undefined,
          device,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setMessage("Fonnte tersimpan. Tempel webhook URL di dashboard Fonnte.");
      setToken("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/channels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, target: testTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal kirim uji");
      setMessage("Pesan uji terkirim. Cek WhatsApp nomor tujuan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal kirim uji");
    } finally {
      setBusy(false);
    }
  }

  async function copyWebhook() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setMessage("Webhook URL disalin.");
  }

  const isLocal =
    webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border)] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">WhatsApp via Fonnte</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sambungkan device Fonnte agar BalAI menjawab chat WhatsApp dari knowledge
              workspace ini.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              fonnte?.hasToken
                ? "bg-emerald-50 text-emerald-800"
                : "bg-[var(--surface-2)] text-[var(--muted)]"
            }`}
          >
            {fonnte?.hasToken ? "Token tersimpan" : "Belum dikonfigurasi"}
          </span>
        </div>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>Login Fonnte → buat/connect device WhatsApp → salin Token.</li>
          <li>Tempel token di bawah, lalu Simpan.</li>
          <li>
            Di Fonnte (Device → Edit), isi Webhook URL BalAI, nyalakan{" "}
            <strong>Autoread</strong>.
          </li>
          <li>Kirim pesan uji ke nomor device dari HP lain.</li>
        </ol>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="token">
              Token Fonnte{fonnte?.hasToken ? " (isi ulang untuk ganti)" : ""}
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={fonnte?.hasToken ? "•••••••• (sudah tersimpan)" : "Token device"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device">Device (opsional)</Label>
            <Input
              id="device"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder="Nomor device Fonnte"
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="block flex-1 break-all rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs">
                {webhookUrl || "—"}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyWebhook()}
                disabled={!webhookUrl}
              >
                Salin
              </Button>
            </div>
            {isLocal ? (
              <p className="text-xs text-amber-800">
                URL lokal tidak bisa diakses Fonnte. Pakai tunnel (ngrok/cloudflared) atau
                deploy, lalu set <code>NEXT_PUBLIC_APP_URL</code> ke URL publik.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

          <Button
            onClick={() => void saveFonnte()}
            disabled={busy || (!token.trim() && !fonnte?.hasToken)}
          >
            {busy ? "Menyimpan..." : "Simpan Fonnte"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="font-semibold">Uji kirim WhatsApp</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Kirim pesan uji ke nomor Anda (format internasional, contoh 62812...).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={testTarget}
            onChange={(e) => setTestTarget(e.target.value)}
            placeholder="6281234567890"
          />
          <Button
            variant="secondary"
            disabled={busy || !testTarget.trim() || !fonnte?.hasToken}
            onClick={() => void sendTest()}
          >
            Kirim uji
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Roadmap channel</h3>
        <ul className="space-y-2">
          {roadmap.map((item) => (
            <li
              key={item.provider}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            >
              <span>{item.label}</span>
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
