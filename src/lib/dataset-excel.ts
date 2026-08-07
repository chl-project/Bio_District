import type { Dataset, Kolom } from "./datasets";

export type BarisTerbaca = Record<string, string | number | boolean | null>;
export type LembarTerbaca = { lembar: string; baris: BarisTerbaca[] };

const WARNA_JUDUL = "FF474238";

/**
 * Lembar data terisi nilai awal sehingga template langsung bisa diunggah dan
 * dibaca tanpa diisi dulu. Nilainya konsisten satu sama lain — pendapatan cocok
 * dengan jumlah unit dikali harga, biaya cocok dengan asumsi RAB — supaya angka
 * yang muncul di layar masuk akal, bukan sekadar mengisi kolom.
 *
 * Konsekuensinya angka pembuka ini ikut terimpor bila tidak diganti. Peringatan
 * untuk menggantinya ditaruh di lembar Petunjuk dan di baris pertama tiap lembar.
 */
export async function buatTemplate(dataset: Dataset): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Harmoni Feasibility Studio";
  wb.created = new Date();

  const petunjuk = wb.addWorksheet("Petunjuk");
  petunjuk.columns = [{ width: 30 }, { width: 22 }, { width: 12 }, { width: 46 }];
  petunjuk.addRow([dataset.judul]).font = { bold: true, size: 14 };
  petunjuk.addRow([dataset.keterangan]);
  petunjuk.addRow([]);
  const ingat = petunjuk.addRow([
    "PENTING: lembar data sudah berisi angka pembuka sebagai contoh. " +
      "Ganti dengan data proyek Anda sebelum dipakai mengambil keputusan.",
  ]);
  ingat.font = { bold: true, color: { argb: "FF9A3412" } };
  petunjuk.addRow(["Jangan mengubah baris judul kolom — baris itu yang dipakai membaca berkas."]).font =
    { italic: true };
  petunjuk.addRow([]);

  for (const lembar of dataset.lembar) {
    petunjuk.addRow([`Lembar: ${lembar.nama}`]).font = { bold: true };
    petunjuk.addRow([lembar.keterangan]);
    const judul = petunjuk.addRow(["Kolom", "Tipe", "Wajib", ""]);
    judul.font = { bold: true };
    for (const kolom of lembar.kolom) {
      petunjuk.addRow([kolom.judul, labelTipe(kolom), kolom.wajib ? "ya" : "", ""]);
    }
    petunjuk.addRow([]);
  }

  for (const lembar of dataset.lembar) {
    const sheet = wb.addWorksheet(lembar.nama);
    sheet.columns = lembar.kolom.map((kolom) => ({ width: kolom.lebar ?? 20 }));

    const baris = sheet.addRow(lembar.kolom.map((kolom) => kolom.judul));
    baris.font = { bold: true, color: { argb: "FFFFFFFF" } };
    baris.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_JUDUL } };
    baris.alignment = { vertical: "middle" };
    sheet.getRow(1).height = 22;
    // Baris judul tetap terlihat saat menggulir isian yang panjang.
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    for (const isi of lembar.contoh) {
      const barisData = sheet.addRow(isi as unknown[]);
      // Kolom angka diberi format ribuan agar nilai besar mudah dibaca dan
      // tetap tersimpan sebagai angka, bukan teks.
      lembar.kolom.forEach((kolom, index) => {
        if (kolom.tipe === "angka") barisData.getCell(index + 1).numFmt = "#,##0.###";
      });
    }
  }

  return wb.xlsx.writeBuffer();
}

export async function bacaUnggahan(
  dataset: Dataset,
  buffer: ArrayBuffer,
): Promise<LembarTerbaca[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const hasil: LembarTerbaca[] = [];
  const lembarHilang: string[] = [];

  for (const definisi of dataset.lembar) {
    const sheet = wb.getWorksheet(definisi.nama);
    if (!sheet) {
      lembarHilang.push(definisi.nama);
      continue;
    }

    const judulBaris = sheet.getRow(1);
    const petaKolom = new Map<number, Kolom>();
    judulBaris.eachCell((cell, kolomKe) => {
      const judul = normalkan(String(cell.value ?? ""));
      const kolom = definisi.kolom.find((item) => normalkan(item.judul) === judul);
      if (kolom) petaKolom.set(kolomKe, kolom);
    });

    const tidakDikenali = definisi.kolom.filter(
      (kolom) => ![...petaKolom.values()].includes(kolom),
    );
    if (petaKolom.size === 0) {
      throw new Error(
        `Lembar "${definisi.nama}" tidak punya baris judul kolom yang dikenali. ` +
          `Gunakan template yang diunduh dari halaman ini.`,
      );
    }

    const baris: BarisTerbaca[] = [];
    sheet.eachRow((row, barisKe) => {
      if (barisKe === 1) return;
      const data: BarisTerbaca = {};
      let terisi = false;

      for (const [kolomKe, kolom] of petaKolom) {
        const nilai = bacaSel(row.getCell(kolomKe).value, kolom);
        data[kolom.kunci] = nilai;
        if (nilai !== null && nilai !== "") terisi = true;
      }
      // Baris kosong di tengah lembar hanya sisa format, bukan data.
      if (terisi) baris.push(data);
    });

    hasil.push({ lembar: definisi.nama, baris });

    if (tidakDikenali.length > 0 && baris.length > 0) {
      // Bukan galat fatal: kolom tambahan diabaikan, kolom hilang jadi null.
      console.warn(
        `[dataset] kolom tidak ditemukan di lembar ${definisi.nama}:`,
        tidakDikenali.map((kolom) => kolom.judul).join(", "),
      );
    }
  }

  if (hasil.length === 0) {
    throw new Error(
      `Tidak ada lembar yang cocok. Berkas harus memuat lembar: ` +
        `${dataset.lembar.map((item) => item.nama).join(", ")}.`,
    );
  }

  return hasil;
}

function labelTipe(kolom: Kolom) {
  if (kolom.tipe === "angka") return "angka";
  if (kolom.tipe === "ya-tidak") return "ya / tidak";
  return "teks";
}

function normalkan(teks: string) {
  return teks.toLowerCase().replace(/\s+/g, " ").trim();
}

function bacaSel(nilai: unknown, kolom: Kolom): string | number | boolean | null {
  const mentah = ekstrakNilai(nilai);
  if (mentah === null || mentah === "") return null;

  if (kolom.tipe === "angka") return keAngka(mentah);
  if (kolom.tipe === "ya-tidak") return /^(ya|y|true|1|kritis)$/i.test(String(mentah).trim());
  return String(mentah).trim();
}

function ekstrakNilai(nilai: unknown): string | number | null {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai === "number" || typeof nilai === "string") return nilai;
  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);

  const obj = nilai as { result?: unknown; text?: unknown; richText?: { text: string }[] };
  if (Array.isArray(obj.richText)) return obj.richText.map((bagian) => bagian.text).join("");
  // Sel rumus: `result` adalah nilai terhitungnya.
  if (obj.result !== undefined) return ekstrakNilai(obj.result);
  if (obj.text !== undefined) return String(obj.text);
  return null;
}

/** Menerima 1850000, "1.850.000", "1,850,000", dan "1850000,50". */
function keAngka(nilai: string | number): number | null {
  if (typeof nilai === "number") return Number.isFinite(nilai) ? nilai : null;

  let teks = nilai.replace(/[\s ]|Rp/gi, "");
  const titik = teks.lastIndexOf(".");
  const koma = teks.lastIndexOf(",");

  if (titik !== -1 && koma !== -1) {
    // Pemisah desimal adalah yang muncul paling belakang.
    teks = koma > titik ? teks.replace(/\./g, "").replace(",", ".") : teks.replace(/,/g, "");
  } else if (koma !== -1) {
    teks = /,\d{1,2}$/.test(teks) ? teks.replace(",", ".") : teks.replace(/,/g, "");
  } else if (titik !== -1) {
    if (!/\.\d{1,2}$/.test(teks) || /\.\d{3}\b/.test(teks)) teks = teks.replace(/\./g, "");
  }

  const angka = Number(teks);
  return Number.isFinite(angka) ? angka : null;
}
