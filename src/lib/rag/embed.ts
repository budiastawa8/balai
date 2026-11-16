/** gemini-embedding-001 with Matryoshka output size */
export const EMBEDDING_DIM = 768;

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

export function embeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
}

type BatchEmbedResponse = {
  embeddings?: Array<{ values?: number[] }>;
  error?: { message?: string };
};

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const key = getApiKey();
  const model = embeddingModel().replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${key}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIM,
      })),
    }),
  });

  const data = (await response.json()) as BatchEmbedResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini embed HTTP ${response.status}`);
  }

  const embeddings = data.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(
      `Gemini embed count mismatch: got ${embeddings.length}, expected ${texts.length}`,
    );
  }

  return embeddings.map((row) => {
    const values = row.values ?? [];
    if (values.length !== EMBEDDING_DIM) {
      throw new Error(
        `Unexpected embedding dimension ${values.length}, expected ${EMBEDDING_DIM}`,
      );
    }
    return values;
  });
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vector] = await embedTexts([query]);
  return vector;
}
