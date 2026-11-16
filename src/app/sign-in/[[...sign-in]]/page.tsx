import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export const instant = false;

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Memuat...</p>}>
        <SignIn />
      </Suspense>
    </div>
  );
}
