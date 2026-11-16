import Link from "next/link";
import { Suspense } from "react";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

function AuthActions({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant={size === "lg" ? "outline" : "ghost"} size={size}>
            Masuk
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size={size}>{size === "lg" ? "Buat workspace" : "Mulai"}</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Button size={size} asChild>
          <Link href="/dashboard">
            {size === "lg" ? "Buka dashboard" : "Dashboard"}
          </Link>
        </Button>
      </Show>
    </>
  );
}

function AuthFallback({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <>
      <Button variant={size === "lg" ? "outline" : "ghost"} size={size} asChild>
        <Link href="/sign-in">Masuk</Link>
      </Button>
      <Button size={size} asChild>
        <Link href="/sign-up">{size === "lg" ? "Buat workspace" : "Mulai"}</Link>
      </Button>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#c8ebe2_0%,transparent_45%),radial-gradient(circle_at_80%_0%,#dce8e3_0%,transparent_40%),linear-gradient(160deg,#f3f6f5_0%,#e7f1ee_55%,#d9ebe4_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,107,92,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,107,92,0.06)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--accent)]">
          BalAI
        </p>
        <div className="flex items-center gap-2">
          <Suspense fallback={<AuthFallback />}>
            <AuthActions />
          </Suspense>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col px-6 pb-24 pt-16 md:pt-24">
        <p className="font-[family-name:var(--font-display)] text-6xl font-semibold tracking-tight text-[var(--accent)] md:text-7xl">
          BalAI
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-4xl">
          Asisten knowledge untuk toko, desa, dan organisasi Anda.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--muted)]">
          Isi pengetahuan per workspace. Uji di web. Sambungkan WhatsApp (Fonnte)
          dan channel lain tanpa mengganti engine AI.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Suspense fallback={<AuthFallback size="lg" />}>
            <AuthActions size="lg" />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
