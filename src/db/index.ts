import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function resolveDatabaseUrl() {
  // Neon/Vercel may inject any of these depending on integration/prefix.
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

function createClient() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add DATABASE_URL (or POSTGRES_URL) in Vercel → Settings → Environment Variables for Production, then Redeploy.",
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
