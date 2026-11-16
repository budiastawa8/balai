import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: true });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    // Dimension change requires recreating the vector column.
    await sql`TRUNCATE TABLE chunks`;
    await sql`ALTER TABLE chunks DROP COLUMN IF EXISTS embedding`;
    await sql`ALTER TABLE chunks ADD COLUMN embedding vector(768)`;
    console.log("chunks.embedding -> vector(768)");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
