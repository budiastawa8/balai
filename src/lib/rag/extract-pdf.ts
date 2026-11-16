import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;

  const candidates = [
    path.join(
      process.cwd(),
      "node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
    ),
    path.join(
      process.cwd(),
      "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
    ),
    path.join(process.cwd(), "node_modules/pdf-parse/dist/worker/pdf.worker.mjs"),
    path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ),
  ];

  for (const candidate of candidates) {
    try {
      PDFParse.setWorker(pathToFileURL(candidate).href);
      workerReady = true;
      return;
    } catch {
      // try next candidate
    }
  }

  // Last resort: let pdf-parse resolve its default worker path.
  PDFParse.setWorker();
  workerReady = true;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  ensurePdfWorker();

  // pdf.js mutates/transfers TypedArrays — pass a copy.
  const data = new Uint8Array(buffer);
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return (result.text || "").trim();
  } finally {
    await parser.destroy();
  }
}
