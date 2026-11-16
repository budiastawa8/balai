import { extractOfficeText } from "./extract-office";
import { extractTextFromPdf } from "./extract-pdf";

export async function extractTextFromFile(
  file: File,
): Promise<{ text: string; sourceType: string }> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    const text = await extractTextFromPdf(buffer);
    return { text, sourceType: "pdf" };
  }

  const office = await extractOfficeText(buffer, file.name);
  if (office) {
    if (!office.text.trim()) {
      throw new Error(`File ${file.name} tidak berisi teks yang bisa diindeks.`);
    }
    return office;
  }

  const text = buffer.toString("utf8");
  if (name.endsWith(".md")) return { text, sourceType: "markdown" };
  if (name.endsWith(".txt")) return { text, sourceType: "text" };

  throw new Error(
    `Format file tidak didukung: ${file.name}. Gunakan PDF, DOCX, XLSX, CSV, TXT, atau MD.`,
  );
}
