import { readFileSync, existsSync } from "node:fs";
import { extractTextFromPdf } from "../src/lib/rag/extract-pdf";

async function main() {
  const arg = process.argv[2];
  let buffer: Buffer;

  if (arg && existsSync(arg)) {
    buffer = readFileSync(arg);
  } else {
    // Minimal valid one-page PDF with "Hello BalAI"
    const pdf = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 55 >>stream
BT /F1 24 Tf 50 80 Td (Hello BalAI) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000371 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
448
%%EOF`;
    buffer = Buffer.from(pdf);
  }

  const text = await extractTextFromPdf(buffer);
  console.log("extracted=", JSON.stringify(text));
}

main().catch((error) => {
  console.error("PDF_FAIL", error);
  process.exit(1);
});
