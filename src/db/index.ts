import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
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
