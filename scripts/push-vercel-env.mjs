import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const keys = [
  "DATABASE_URL",
  "GEMINI_API_KEY",
  "GEMINI_CHAT_MODEL",
  "GEMINI_EMBEDDING_MODEL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
];

const envFile = readFileSync(".env.local", "utf8");
const map = new Map();
for (const line of envFile.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  map.set(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
}

for (const key of keys) {
  const value = map.get(key);
  if (!value) {
    console.log(`SKIP ${key} (missing)`);
    continue;
  }

  const added = spawnSync(
    "vercel",
    [
      "env",
      "add",
      key,
      "--environment",
      "production,preview,development",
      "--value",
      value,
      "--yes",
      "--force",
    ],
    {
      encoding: "utf8",
      shell: true,
    },
  );

  if (added.status === 0) {
    console.log(`OK ${key}`);
  } else {
    console.log(
      `FAIL ${key}: ${(added.stderr || added.stdout || "").replace(/\s+/g, " ").slice(0, 240)}`,
    );
  }
}
