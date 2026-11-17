let workerReady = false;

type PdfParseModule = typeof import("pdf-parse");
type PdfWorkerModule = typeof import("pdf-parse/worker");

async function loadPdfParse(): Promise<{
  PDFParse: PdfParseModule["PDFParse"];
  CanvasFactory: PdfWorkerModule["CanvasFactory"];
}> {
  // Worker/canvas polyfills must load before pdf-parse (required on Vercel).
  const worker = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  if (!workerReady) {
    // Inline worker data is more reliable on serverless than filesystem paths.
    PDFParse.setWorker(worker.getData());
    workerReady = true;
  }

  return { PDFParse, CanvasFactory: worker.CanvasFactory };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  if (!buffer.length) {
    throw new Error("File PDF kosong.");
  }

  let PDFParse: PdfParseModule["PDFParse"];
  let CanvasFactory: PdfWorkerModule["CanvasFactory"];
  try {
    ({ PDFParse, CanvasFactory } = await loadPdfParse());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gagal memuat parser PDF di server: ${message}. Pastikan @napi-rs/canvas terpasang.`,
    );
  }

  // pdf.js mutates/transfers TypedArrays — pass a copy.
  const data = new Uint8Array(buffer);
  const parser = new PDFParse({
    data,
    useWasm: false,
    CanvasFactory,
  });
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
