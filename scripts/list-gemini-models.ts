import { config } from "dotenv";

config({ path: ".env.local", override: true });

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
  );
  const data = (await res.json()) as {
    models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    error?: { message: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }

  const embed = (data.models || []).filter((m) =>
    (m.supportedGenerationMethods || []).some((method) =>
      method.toLowerCase().includes("embed"),
    ),
  );
  const chat = (data.models || []).filter((m) =>
    (m.supportedGenerationMethods || []).includes("generateContent"),
  );

  console.log("EMBED_MODELS");
  for (const m of embed) console.log("- " + m.name);
  console.log("CHAT_MODELS_SAMPLE");
  for (const m of chat.slice(0, 15)) console.log("- " + m.name);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
