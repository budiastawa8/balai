"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ChatPanel({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, message: text, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat gagal");

      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          role: "assistant",
          content: data.message.content,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-4">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Uji asisten dengan pertanyaan berdasarkan knowledge yang sudah diunggah.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm"
                  : "mr-8 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
              }
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {m.role === "user" ? "Anda" : "BalAI"}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya sesuatu tentang knowledge tenant ini..."
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="flex justify-end">
          <Button onClick={() => void send()} disabled={loading || !input.trim()}>
            {loading ? "Menjawab..." : "Kirim"}
          </Button>
        </div>
      </div>
    </div>
  );
}
