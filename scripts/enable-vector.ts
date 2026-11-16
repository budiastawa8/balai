import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: true });
config({ override: false });

async function tryConnect(label: string, url: string) {
  console.log("trying", label);
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    const rows = await sql`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    console.log("OK", label, "vector_extension=", rows[0]?.extname || "MISSING");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("FAIL", label, message);
    return false;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const base = process.env.DATABASE_URL;
  if (!base) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const unpooled = process.env.DATABASE_URL_UNPOOLED;
  const noBinding = base
    .replace("&channel_binding=require", "")
    .replace("?channel_binding=require&", "?")
    .replace("?channel_binding=require", "");

  const candidates: Array<[string, string]> = [
    ["DATABASE_URL", base],
    ["DATABASE_URL_no_channel_binding", noBinding],
  ];

  if (unpooled) {
    candidates.push(["DATABASE_URL_UNPOOLED", unpooled]);
    candidates.push([
      "DATABASE_URL_UNPOOLED_no_channel_binding",
      unpooled
        .replace("&channel_binding=require", "")
        .replace("?channel_binding=require&", "?")
        .replace("?channel_binding=require", ""),
    ]);
  }

  for (const [label, url] of candidates) {
    if (await tryConnect(label, url)) {
      process.exit(0);
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
