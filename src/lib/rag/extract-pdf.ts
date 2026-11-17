import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let workerReady = false;

function resolvePdfPackageDir(): string {
  try {
    const require = createRequire(import.meta.url);
    return path.dirname(require.resolve("pdf-parse/package.json"));
  } catch {
    return path.join(process.cwd(), "node_modules/pdf-parse");
  }
}

function ensurePdfWorker() {
  if (workerReady) return;

  const pkgDir = resolvePdfPackageDir();
  const candidates = [
    path.join(pkgDir, "dist/pdf-parse/cjs/pdf.worker.mjs"),
    path.join(pkgDir, "dist/pdf-parse/esm/pdf.worker.mjs"),
    path.join(pkgDir, "dist/worker/pdf.worker.mjs"),
    path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    PDFParse.setWorker(pathToFileURL(candidate).href);
    workerReady = true;
    return;
  }

  // Last resort: let pdf-parse resolve its default worker path.
  PDFParse.setWorker();
  workerReady = true;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!buffer.length) {
    throw new Error("File PDF kosong.");
  }

  ensurePdfWorker();

  // pdf.js mutates/transfers TypedArrays — pass a copy.
  const data = new Uint8Array(buffer);
  const parser = new PDFParse({ data, useWasm: false });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gagal membaca PDF: ${message}. Pastikan file tidak terlindungi password dan berisi teks (bukan hanya scan gambar).`,
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
