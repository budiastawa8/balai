"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelsPanel } from "./channels-panel";
import { ChatPanel } from "./chat-panel";
import { KnowledgePanel } from "./knowledge-panel";

type Tenant = {
  id: string;
  name: string;
  slug: string;
};

type Tab = "knowledge" | "chat" | "channels";

export function DashboardShell() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("knowledge");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat workspace");
      setTenants(data.tenants || []);
      if (!tenantId && data.tenants?.[0]?.id) {
        setTenantId(data.tenants[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTenant() {
    if (!newName.trim()) return;
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal membuat workspace");
      return;
    }
    setNewName("");
    await loadTenants();
    setTenantId(data.tenant.id);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--accent)]">
            BalAI
          </Link>
          <div className="flex items-center gap-3">
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Workspace
            </p>
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Memuat...</p>
            ) : (
              <ul className="space-y-1">
                {tenants.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTenantId(t.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                        tenantId === t.id
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama workspace baru"
            />
            <Button
              size="sm"
              className="w-full"
              variant="secondary"
              onClick={() => void createTenant()}
            >
              Tambah
            </Button>
          </div>

          <nav className="flex flex-col gap-1">
            {(
              [
                ["knowledge", "Knowledge"],
                ["chat", "Chat uji"],
                ["channels", "Channel"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-3 py-2 text-left text-sm ${
                  tab === id
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section>
          {error ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          {!tenantId ? (
            <p className="text-sm text-[var(--muted)]">Pilih atau buat workspace.</p>
          ) : tab === "knowledge" ? (
            <KnowledgePanel tenantId={tenantId} />
          ) : tab === "chat" ? (
            <ChatPanel tenantId={tenantId} />
          ) : (
            <ChannelsPanel tenantId={tenantId} />
          )}
        </section>
      </main>
    </div>
  );
}
