import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function tryUrl(label: string, url: string) {
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
  try {
    const rows = await sql`select current_user, current_database()`;
    console.log("OK", label, rows[0]);
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("vector enabled");
    await sql.end({ timeout: 5 });
    return true;
  } catch (error) {
    console.log(
      "FAIL",
      label,
      error instanceof Error ? error.message : String(error),
    );
    await sql.end({ timeout: 5 }).catch(() => undefined);
    return false;
  }
}

async function main() {
  const base = process.env.DATABASE_URL!;
  const u = new URL(base);
  const user = decodeURIComponent(u.username);
  const pass = decodeURIComponent(u.password);
  const pooledHost = u.hostname;
  const directHost = pooledHost.replace("-pooler", "");

  console.log("user=", user);
  console.log("pass_len=", pass.length);
  console.log("pooledHost=", pooledHost);
  console.log("directHost=", directHost);

  const urls: Array<[string, string]> = [
    [
      "pooled_sslmode",
      `postgresql://${user}:${pass}@${pooledHost}/neondb?sslmode=require`,
    ],
    [
      "direct_sslmode",
      `postgresql://${user}:${pass}@${directHost}/neondb?sslmode=require`,
    ],
    [
      "pooled_pgbouncer",
      `postgresql://${user}:${pass}@${pooledHost}/neondb?sslmode=require&pgbouncer=true`,
    ],
  ];

  for (const [label, url] of urls) {
    if (await tryUrl(label, url)) process.exit(0);
  }
  process.exit(1);
}

main();
