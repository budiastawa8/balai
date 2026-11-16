import mammoth from "mammoth";
import * as XLSX from "xlsx";

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}

export function extractTextFromSpreadsheet(
  buffer: Buffer,
  fileName: string,
): string {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    parts.push(`# Sheet: ${sheetName}`);

    if (rows.length === 0) {
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) parts.push(csv.trim());
      continue;
    }

    for (const [index, row] of rows.entries()) {
      const cells = Object.entries(row)
        .filter(([, value]) => String(value ?? "").trim() !== "")
        .map(([key, value]) => `${key}: ${String(value).trim()}`);
      if (cells.length === 0) continue;
      parts.push(`Baris ${index + 1}\n${cells.join("\n")}`);
    }
  }

  const text = parts.join("\n\n").trim();
  if (!text) {
    throw new Error(`Tidak ada teks yang bisa diekstrak dari ${fileName}`);
  }
  return text;
}

export async function extractOfficeText(
  buffer: Buffer,
  fileName: string,
): Promise<{ text: string; sourceType: string } | null> {
  const name = fileName.toLowerCase();

  if (name.endsWith(".docx")) {
    const text = await extractTextFromDocx(buffer);
    return { text, sourceType: "docx" };
  }

  if (name.endsWith(".doc")) {
    throw new Error(
      "Format .doc lama tidak didukung. Simpan sebagai .docx atau PDF lalu unggah ulang.",
    );
  }

  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    if (name.endsWith(".csv")) {
      return { text: buffer.toString("utf8").trim(), sourceType: "csv" };
    }
    const text = extractTextFromSpreadsheet(buffer, fileName);
    return {
      text,
      sourceType: name.endsWith(".xls") ? "xls" : "xlsx",
    };
  }

  return null;
}
