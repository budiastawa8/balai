import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: true });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const tables = await sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    console.log("tables=" + tables.map((t) => t.table_name).join(","));
    const v = await sql`
      select extname from pg_extension where extname = 'vector'
    `;
    console.log("vector=" + (v[0]?.extname || "MISSING"));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("DB_FAIL", error instanceof Error ? error.message : error);
  process.exit(1);
});
