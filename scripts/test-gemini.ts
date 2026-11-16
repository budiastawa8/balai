import { config } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedTexts } from "../src/lib/rag/embed";

config({ path: ".env.local", override: true });

async function main() {
  const vectors = await embedTexts(["tes knowledge BalAI", "pararem desa"]);
  console.log(
    "embed_ok count=" +
      vectors.length +
      " dim=" +
      vectors[0].length +
      " model=" +
      (process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001"),
  );

  const chatModel = process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash";
  const model = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!,
  ).getGenerativeModel({ model: chatModel });
  const result = await model.generateContent("Jawab satu kata: siap");
  console.log("chat_ok model=" + chatModel);
  console.log("chat_sample=" + result.response.text().trim().slice(0, 80));
}

main().catch((error) => {
  console.error(
    "GEMINI_FAIL",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
