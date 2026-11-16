import { NextResponse } from "next/server";

/**
 * Public diagnostics for deploy env (no secrets leaked).
 */
export async function GET() {
  const flags = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    DATABASE_URL_UNPOOLED: Boolean(process.env.DATABASE_URL_UNPOOLED),
    POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
    PGHOST: Boolean(process.env.PGHOST || process.env.POSTGRES_HOST),
    PGUSER: Boolean(process.env.PGUSER || process.env.POSTGRES_USER),
    PGPASSWORD: Boolean(process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD),
    PGDATABASE: Boolean(process.env.PGDATABASE || process.env.POSTGRES_DATABASE),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    CLERK_SECRET_KEY: Boolean(process.env.CLERK_SECRET_KEY),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
  };

  const hasDb =
    flags.DATABASE_URL ||
    flags.POSTGRES_URL ||
    flags.DATABASE_URL_UNPOOLED ||
    flags.POSTGRES_PRISMA_URL ||
    (flags.PGHOST && flags.PGUSER && flags.PGPASSWORD && flags.PGDATABASE);

  return NextResponse.json({
    ok: true,
    hasDb,
    flags,
  });
}
