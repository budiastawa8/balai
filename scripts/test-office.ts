import { writeFileSync, unlinkSync } from "node:fs";
import * as XLSX from "xlsx";
import { extractOfficeText } from "../src/lib/rag/extract-office";

async function main() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([
    { Nama: "Budi", Jabatan: "Kepala Desa" },
    { Nama: "Sari", Jabatan: "Sekretaris" },
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
  const xlsxPath = "scripts/_tmp-test.xlsx";
  XLSX.writeFile(wb, xlsxPath);

  const xlsxBuf = Buffer.from(await (await import("node:fs")).promises.readFile(xlsxPath));
  const excel = await extractOfficeText(xlsxBuf, "pegawai.xlsx");
  console.log("xlsx_ok", excel?.sourceType, (excel?.text || "").slice(0, 120).replace(/\n/g, " | "));

  unlinkSync(xlsxPath);

  // Minimal docx is harder without a fixture; verify mammoth import works.
  const mammoth = await import("mammoth");
  console.log("mammoth_ok", typeof mammoth.extractRawText === "function");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
