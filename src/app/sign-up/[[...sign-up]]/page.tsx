import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export const instant = false;

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Memuat...</p>}>
        <SignUp />
      </Suspense>
    </div>
  );
}
