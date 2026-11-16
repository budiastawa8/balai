"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DocRow = {
  id: string;
  title: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  errorMessage: string | null;
  createdAt: string;
};

export function KnowledgePanel({ tenantId }: { tenantId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/knowledge?tenantId=${tenantId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memuat knowledge");
    setDocs(data.documents || []);
  }, [tenantId]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Gagal memuat"),
    );
  }, [load]);

  async function upload() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.set("tenantId", tenantId);
        form.set("title", title || file.name);
        form.set("file", file);
        res = await fetch("/api/knowledge/upload", { method: "POST", body: form });
      } else {
        res = await fetch("/api/knowledge/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, title, content }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      setTitle("");
      setContent("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setLoading(false);
    }
  }

  async function reindex(docId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/${docId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reindex" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reindex gagal");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reindex gagal");
    } finally {
      setLoading(false);
    }
  }

  async function removeDoc(docId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hapus gagal");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hapus gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-4">
        <div className="space-y-2">
          <Label htmlFor="title">Judul</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="FAQ Toko / Profil Desa"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">Teks knowledge</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tempel informasi yang ingin dijawab asisten..."
            rows={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Atau unggah file (.txt, .md, .pdf)</Label>
          <Input
            id="file"
            type="file"
            accept=".txt,.md,.pdf,text/plain,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          onClick={() => void upload()}
          disabled={loading || (!content.trim() && !file) || (!title.trim() && !file)}
        >
          {loading ? "Mengindeks..." : "Simpan & indeks"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Dokumen</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada knowledge.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {doc.sourceType} · {doc.chunkCount} chunk · {doc.status}
                  </p>
                  {doc.errorMessage ? (
                    <p className="mt-1 text-xs text-red-700">{doc.errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {doc.status === "failed" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => void reindex(doc.id)}
                    >
                      Indeks ulang
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    onClick={() => void removeDoc(doc.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
