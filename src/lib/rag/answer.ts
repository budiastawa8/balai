import { GoogleGenerativeAI } from "@google/generative-ai";
import { retrieveRelevantChunks, type RetrievedChunk } from "./retrieve";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

function chatModel() {
  return process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-lite-latest";
}

const DEFAULT_SYSTEM = `You are BalAI, a helpful knowledge assistant for a specific organization (tenant).
Answer ONLY using the provided knowledge context.
If the answer is not in the context, say you don't know based on the available knowledge.
Reply in the same language as the user's question.
Be concise and practical. Do not invent facts.`;

export type AnswerResult = {
  answer: string;
  citations: Array<{ documentId: string; excerpt: string }>;
  chunks: RetrievedChunk[];
};

export async function answerFromKnowledge(params: {
  tenantId: string;
  question: string;
  systemPrompt?: string | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<AnswerResult> {
  const chunks = await retrieveRelevantChunks(params.tenantId, params.question);
  const context =
    chunks.length === 0
      ? "(No matching knowledge found.)"
      : chunks
          .map(
            (c, i) =>
              `[#${i + 1} doc:${c.documentId} score:${c.score.toFixed(3)}]\n${c.content}`,
          )
          .join("\n\n");

  const systemInstruction = `${params.systemPrompt?.trim() || DEFAULT_SYSTEM}\n\nKnowledge context:\n${context}`;

  const model = getClient().getGenerativeModel({
    model: chatModel(),
    systemInstruction,
    generationConfig: { temperature: 0.2 },
  });

  const history = (params.history ?? []).slice(-8).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: message.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(params.question);
  const answer =
    result.response.text()?.trim() ||
    "Maaf, saya tidak dapat menghasilkan jawaban saat ini.";

  return {
    answer,
    citations: chunks.map((c) => ({
      documentId: c.documentId,
      excerpt: c.content.slice(0, 220),
    })),
    chunks,
  };
}
