import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function buildUrlFromPgParts() {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || "5432";

  if (!host || !user || !password || !database) return "";

  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `postgresql://${auth}@${host}:${port}/${database}?sslmode=require`;
}

function resolveDatabaseUrl() {
  // Neon/Vercel may inject any of these depending on integration/prefix.
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    buildUrlFromPgParts() ||
    ""
  );
}

function createClient() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Di Vercel (Production) pastikan ada DATABASE_URL atau POSTGRES_URL / PGHOST+PGUSER+PGPASSWORD+PGDATABASE, lalu Redeploy.",
    );
  }
  return postgres(url, { prepare: false, max: 10 });
}

export function getDb() {
  const client = globalForDb.pgClient ?? createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
  }
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
