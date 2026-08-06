// Ekstraksi teks dari berkas yang sudah ada di Blob.
//
// PDF memakai unpdf (pdf.js versi serverless, tanpa ketergantungan canvas).
// Spreadsheet memakai ExcelJS — dipilih karena paket `xlsx` di npm punya
// advisory high severity tanpa perbaikan tersedia.

export type Potongan = {
  /** Label sumber untuk rujukan jawaban, mis. "hal. 4" atau "sheet BOQ". */
  lokasi: string;
  teks: string;
};

const EKSTENSI_TEKS: Record<string, "pdf" | "spreadsheet"> = {
  pdf: "pdf",
  xlsx: "spreadsheet",
  xls: "spreadsheet",
};

export function bisaDiekstrak(namaAtauPath: string) {
  return ekstensiDari(namaAtauPath) in EKSTENSI_TEKS;
}

function ekstensiDari(namaAtauPath: string) {
  const nama = namaAtauPath.split("/").pop() ?? namaAtauPath;
  const titik = nama.lastIndexOf(".");
  return titik === -1 ? "" : nama.slice(titik + 1).toLowerCase();
}

export async function ekstrakTeks(url: string, nama: string): Promise<Potongan[]> {
  const jenis = EKSTENSI_TEKS[ekstensiDari(nama)];
  if (!jenis) {
    throw new Error(
      `Ekstraksi teks belum didukung untuk ".${ekstensiDari(nama)}". ` +
        `Yang didukung: .pdf, .xlsx, .xls`,
    );
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Berkas tidak terbaca dari Blob (HTTP ${res.status}).`);
  const buffer = await res.arrayBuffer();

  return jenis === "pdf" ? dariPdf(buffer) : dariSpreadsheet(buffer);
}

async function dariPdf(buffer: ArrayBuffer): Promise<Potongan[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });

  return text
    .map((isi, index) => ({ lokasi: `hal. ${index + 1}`, teks: rapikan(isi) }))
    .filter((potongan) => potongan.teks.length > 0);
}

async function dariSpreadsheet(buffer: ArrayBuffer): Promise<Potongan[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const hasil: Potongan[] = [];
  workbook.eachSheet((sheet) => {
    const baris: string[] = [];
    sheet.eachRow((row) => {
      // `row.values` berindeks 1; kolom kosong dibiarkan agar kolom tetap sejajar.
      const nilai = (row.values as unknown[]).slice(1).map(selKeTeks);
      if (nilai.some((sel) => sel !== "")) baris.push(nilai.join(" | "));
    });

    if (baris.length > 0) {
      hasil.push({ lokasi: `sheet ${sheet.name}`, teks: baris.join("\n") });
    }
  });

  return hasil;
}

function selKeTeks(sel: unknown): string {
  if (sel === null || sel === undefined) return "";
  if (typeof sel === "object") {
    const obj = sel as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(obj.richText)) return obj.richText.map((bagian) => bagian.text).join("");
    if (obj.text !== undefined) return String(obj.text);
    if (obj.result !== undefined) return String(obj.result);
    if (sel instanceof Date) return sel.toISOString().slice(0, 10);
    return "";
  }
  return String(sel);
}

function rapikan(teks: string) {
  return teks.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
