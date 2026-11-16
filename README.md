# BalAI

SaaS asisten AI berbasis **knowledge per workspace (tenant)**. Uji di web dulu, lalu sambungkan channel (WhatsApp via Fonnte, dan provider lain lewat adapter).

## Fitur MVP

- Auth multi-user (Clerk)
- Multi-tenant workspace + isolasi knowledge
- Upload knowledge (teks / `.txt` / `.md` / `.pdf`) + indexing RAG (pgvector)
- Chat uji di dashboard (jawab hanya dari knowledge)
- Abstraksi multi-channel + stub/wiring Fonnte webhook

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + pgvector (Drizzle ORM)
- Google Gemini embeddings + chat
- Clerk auth
- Channel adapters (`src/lib/channels`)

## Setup

1. Siapkan Postgres dengan ekstensi vector:

```bash
psql "$DATABASE_URL" -f src/db/migrate.sql
```

2. Salin env:

```bash
cp .env.example .env.local
```

Isi minimal:

- `DATABASE_URL`
- `GEMINI_API_KEY` (dari [Google AI Studio](https://aistudio.google.com/apikey))
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

3. Push schema:

```bash
npm run db:push
```

4. Jalankan:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Fonnte (WhatsApp)

1. Di dashboard BalAI → **Channel**, simpan token device Fonnte.
2. Set `NEXT_PUBLIC_APP_URL` ke URL publik (deploy atau tunnel ngrok/cloudflared).
3. Salin **Webhook URL** dari Channel, tempel di Fonnte → Device → Edit.
4. Nyalakan **Autoread** di Fonnte.
5. Uji dengan **Kirim uji** di Channel, lalu chat dari HP ke nomor device.

Webhook path:

```text
https://<public-url>/api/webhooks/fonnte/<tenantId>
```

Adapter: `src/lib/channels/fonnte.ts`. Channel lain ditambah sebagai adapter tanpa mengubah RAG.

## Roadmap channel

1. Fonnte (WhatsApp) — stub + webhook siap
2. Meta WhatsApp Cloud API
3. Telegram Bot API
4. Instagram / Messenger
5. Embed widget website
6. Email / helpdesk (opsional)

## Scripts

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run db:push` | Sync schema ke Postgres |
| `npm run db:generate` | Generate migrasi Drizzle |
| `npm run build` | Production build |
