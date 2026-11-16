import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";

export const instant = false;

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-[var(--muted)]">Memuat dashboard...</p>}>
      <DashboardShell />
    </Suspense>
  );
}
