import {
  kolomIsian,
  kolomRumus,
  type BarisNilai,
  type Dataset,
  type Kolom,
  type KonteksHitung,
  type Lembar,
  type RefRumus,
} from "./datasets";

export type BarisTerbaca = BarisNilai;
export type LembarTerbaca = { lembar: string; baris: BarisTerbaca[] };

type LembarExcel = import("exceljs").Worksheet;
type BukuKerja = import("exceljs").Workbook;

const WARNA_JUDUL = "FF474238";
/** Judul kolom hasil hitungan dibedakan supaya jelas mana yang tidak perlu diisi. */
const WARNA_JUDUL_RUMUS = "FF8C5A3A";
const WARNA_TEKS_RUMUS = "FF7A4B22";
const WARNA_TOTAL = "FFF1E7DA";

/** Baris 1 selalu judul kolom; data mulai baris 2. */
const BARIS_AWAL = 2;
const LABEL_TOTAL = "TOTAL";

const FORMAT_ANGKA = "#,##0.###";
const FORMAT_PERSEN = "0.0%";

/**
 * Template berisi nilai awal sehingga langsung bisa diunggah dan dibaca tanpa
 * diisi dulu. Nilainya konsisten satu sama lain — pendapatan cocok dengan jumlah
 * unit dikali harga, biaya cocok dengan asumsi RAB — supaya angka yang muncul di
 * layar masuk akal, bukan sekadar mengisi kolom.
 *
 * Konsekuensinya angka pembuka ini ikut terimpor bila tidak diganti. Peringatan
 * untuk menggantinya ditaruh di lembar Petunjuk dan di baris pertama tiap lembar.
 */
export async function buatTemplate(dataset: Dataset): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Harmoni Feasibility Studio";
  wb.created = new Date();

  const isi = hitungTurunan(
    dataset,
    dataset.lembar.map((lembar) => ({
      lembar: lembar.nama,
      baris: lembar.contoh.map((nilai) => barisDariContoh(lembar, nilai)),
    })),
  );

  tulisPetunjuk(wb, dataset, ukuranDari(dataset, isi));
  tulisSemuaLembar(wb, dataset, isi);

  return wb.xlsx.writeBuffer();
}

/**
 * Hasil olahan: data yang tersimpan ditulis kembali lengkap dengan kolom hitungan
 * sebagai rumus Excel yang hidup — bukan angka mati. Penerima berkas bisa menekan
 * satu sel dan melihat perhitungannya di bilah rumus, lalu mengubah volume atau
 * harga satuan dan melihat total serta persentasenya ikut berubah.
 */
export async function buatHasilOlahan(
  dataset: Dataset,
  isi: LembarTerbaca[],
  ringkasan: { label: string; nilai: string; rumus?: string }[],
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Harmoni Feasibility Studio";
  wb.created = new Date();

  const terhitung = hitungTurunan(dataset, isi);

  const ringkas = wb.addWorksheet("Ringkasan");
  ringkas.columns = [{ width: 34 }, { width: 26 }, { width: 62 }];
  ringkas.addRow([dataset.judul]).font = { bold: true, size: 14 };
  ringkas.addRow(["Hasil olahan data terunggah — angka di bawah dihitung sistem."]);
  ringkas.addRow([
    "Lembar data memakai rumus Excel yang hidup: ubah isian, angka turunan ikut berubah.",
  ]).font = { italic: true };
  ringkas.addRow([]);

  const judulRingkas = ringkas.addRow(["Angka terhitung", "Nilai", "Rumus"]);
  judulRingkas.font = { bold: true, color: { argb: "FFFFFFFF" } };
  judulRingkas.eachCell((sel) => {
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_JUDUL } };
  });
  for (const item of ringkasan) {
    ringkas.addRow([item.label, item.nilai, item.rumus ?? ""]);
  }

  tulisSemuaLembar(wb, dataset, terhitung);

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

  for (const definisi of dataset.lembar) {
    const sheet = wb.getWorksheet(definisi.nama);
    if (!sheet) continue;

    // Hanya kolom isian yang dibaca. Kolom hitungan sengaja diabaikan lalu
    // dihitung ulang: berkas bisa datang dari Excel yang belum menyegarkan
    // rumusnya, atau dari salinan yang angkanya ditempel sebagai nilai mati.
    const isian = kolomIsian(definisi);
    const judulBaris = sheet.getRow(1);
    const petaKolom = new Map<number, Kolom>();
    judulBaris.eachCell((cell, kolomKe) => {
      const judul = normalkan(String(cell.value ?? ""));
      const kolom = isian.find((item) => normalkan(item.judul) === judul);
      if (kolom) petaKolom.set(kolomKe, kolom);
    });

    const tidakDikenali = isian.filter((kolom) => ![...petaKolom.values()].includes(kolom));
    if (petaKolom.size === 0) {
      throw new Error(
        `Lembar "${definisi.nama}" tidak punya baris judul kolom yang dikenali. ` +
          `Gunakan template yang diunduh dari halaman ini.`,
      );
    }

    const kolomPertama = Math.min(...petaKolom.keys());
    const baris: BarisTerbaca[] = [];
    sheet.eachRow((row, barisKe) => {
      if (barisKe === 1) return;
      // Baris TOTAL adalah hasil hitungan berkas, bukan data — ikut terbaca
      // akan menggandakan seluruh nilainya.
      if (barisTotal(row.getCell(1).value) || barisTotal(row.getCell(kolomPertama).value)) return;

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

  return hitungTurunan(dataset, hasil);
}

/**
 * Mengisi kolom hitungan pada setiap baris, memakai fungsi `hitung` yang sepadan
 * dengan rumus Excel-nya. Kolom dihitung berurutan sesuai definisi sehingga rumus
 * boleh memakai hasil kolom sebelumnya di baris yang sama — sama seperti di Excel.
 */
export function hitungTurunan(dataset: Dataset, isi: LembarTerbaca[]): LembarTerbaca[] {
  const peta = new Map(isi.map((item) => [item.lembar, item.baris]));
  const konteksLembar = (nama: string) => peta.get(nama) ?? [];

  for (const definisi of dataset.lembar) {
    const rumus = kolomRumus(definisi);
    const baris = peta.get(definisi.nama);
    if (rumus.length === 0 || !baris) continue;

    const sebelumnya: BarisNilai[] = [];
    for (const row of baris) {
      const konteks: KonteksHitung = { lembar: konteksLembar, sebelumnya };
      for (const kolom of rumus) row[kolom.kunci] = kolom.rumus!.hitung(row, konteks);
      sebelumnya.push(row);
    }
  }

  return isi;
}

/** Baris data dari satu baris `contoh`, yang sejajar dengan kolom isian. */
function barisDariContoh(lembar: Lembar, nilai: (string | number)[]): BarisNilai {
  const data: BarisNilai = {};
  kolomIsian(lembar).forEach((kolom, indeks) => {
    data[kolom.kunci] = normalkanNilai(nilai[indeks], kolom);
  });
  return data;
}

function tulisPetunjuk(wb: BukuKerja, dataset: Dataset, jumlahBaris: Map<string, number>) {
  const petunjuk = wb.addWorksheet("Petunjuk");
  petunjuk.columns = [{ width: 32 }, { width: 20 }, { width: 10 }, { width: 64 }];
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
  petunjuk.addRow([
    "Kolom berjudul oranye berisi rumus. Biarkan apa adanya: isinya dihitung ulang " +
      "sistem saat berkas diunggah, jadi perubahan manual di kolom itu tidak tersimpan.",
  ]).font = { italic: true };
  petunjuk.addRow([]);

  for (const lembar of dataset.lembar) {
    petunjuk.addRow([`Lembar: ${lembar.nama}`]).font = { bold: true };
    petunjuk.addRow([lembar.keterangan]);

    const judul = petunjuk.addRow(["Kolom", "Tipe", "Wajib", "Rumus"]);
    judul.font = { bold: true };

    for (const kolom of lembar.kolom) {
      const baris = petunjuk.addRow([
        kolom.judul,
        labelTipe(kolom),
        kolom.wajib ? "ya" : "",
        kolom.rumus ? kolom.rumus.teks : "",
      ]);
      if (kolom.rumus) {
        baris.getCell(4).font = { color: { argb: WARNA_TEKS_RUMUS } };
        // Bentuk Excel-nya ikut ditulis supaya perhitungannya bisa diperiksa
        // tanpa membuka berkasnya di Excel lebih dulu.
        const ref = buatRef(dataset, lembar, BARIS_AWAL, jumlahBaris);
        petunjuk.addRow(["", "", "", `Rumus Excel baris ${BARIS_AWAL}: =${kolom.rumus.excel(ref)}`])
          .getCell(4).font = { italic: true, size: 10 };
      }
    }
    petunjuk.addRow([]);
  }
}

function tulisSemuaLembar(wb: BukuKerja, dataset: Dataset, isi: LembarTerbaca[]) {
  const jumlahBaris = ukuranDari(dataset, isi);

  for (const definisi of dataset.lembar) {
    const sheet = wb.addWorksheet(definisi.nama);
    const baris = isi.find((item) => item.lembar === definisi.nama)?.baris ?? [];
    tulisLembar(sheet, dataset, definisi, baris, jumlahBaris);
  }
}

function tulisLembar(
  sheet: LembarExcel,
  dataset: Dataset,
  definisi: Lembar,
  data: BarisNilai[],
  jumlahBaris: Map<string, number>,
) {
  sheet.columns = definisi.kolom.map((kolom) => ({ width: kolom.lebar ?? 20 }));

  const judul = sheet.addRow(definisi.kolom.map((kolom) => kolom.judul));
  judul.font = { bold: true, color: { argb: "FFFFFFFF" } };
  judul.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 26;
  definisi.kolom.forEach((kolom, indeks) => {
    const sel = judul.getCell(indeks + 1);
    sel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: kolom.rumus ? WARNA_JUDUL_RUMUS : WARNA_JUDUL },
    };
    if (kolom.rumus) {
      const ref = buatRef(dataset, definisi, BARIS_AWAL, jumlahBaris);
      sel.note =
        `Kolom hasil hitungan — tidak perlu diisi.\n${kolom.rumus.teks}\n` +
        `Rumus baris ${BARIS_AWAL}: =${kolom.rumus.excel(ref)}`;
    }
  });
  // Baris judul tetap terlihat saat menggulir isian yang panjang.
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  data.forEach((isi, indeks) => {
    const nomor = BARIS_AWAL + indeks;
    const ref = buatRef(dataset, definisi, nomor, jumlahBaris);
    const baris = sheet.addRow([]);

    definisi.kolom.forEach((kolom, kolomKe) => {
      const sel = baris.getCell(kolomKe + 1);
      const nilai = isi[kolom.kunci];

      if (kolom.rumus) {
        sel.value = {
          formula: kolom.rumus.excel(ref),
          // Nilai tersimpan diikutkan supaya angkanya tetap terbaca oleh
          // pembaca yang tidak menghitung ulang rumus. Nilai nol hilang saat
          // dibaca ulang oleh ExcelJS (bukan oleh Excel), dan itu tidak
          // menjadi masalah: kolom rumus selalu dihitung ulang saat impor.
          result: typeof nilai === "number" && Number.isFinite(nilai) ? nilai : undefined,
        };
        sel.font = { color: { argb: WARNA_TEKS_RUMUS } };
      } else {
        sel.value = nilaiExcel(nilai, kolom);
      }

      const format = formatKolom(kolom);
      if (format) sel.numFmt = format;
    });
  });

  tulisBarisTotal(sheet, dataset, definisi, data, jumlahBaris);
}

function tulisBarisTotal(
  sheet: LembarExcel,
  dataset: Dataset,
  definisi: Lembar,
  data: BarisNilai[],
  jumlahBaris: Map<string, number>,
) {
  const berTotal = definisi.kolom.filter((kolom) => kolom.total);
  if (berTotal.length === 0 || data.length === 0) return;

  const nomor = BARIS_AWAL + data.length;
  const ref = buatRef(dataset, definisi, nomor, jumlahBaris);
  const baris = sheet.addRow([]);
  baris.font = { bold: true };
  baris.getCell(1).value = LABEL_TOTAL;

  for (const kolom of berTotal) {
    const indeks = definisi.kolom.indexOf(kolom) + 1;
    const sel = baris.getCell(indeks);
    const total = kolom.total!;

    if (total.jenis === "jumlah") {
      sel.value = {
        formula: `SUM(${ref.rentang(kolom.kunci)})`,
        result: jumlahkan(data, kolom.kunci),
      };
    } else {
      const atas = jumlahkan(data, total.atas);
      const bawah = jumlahkan(data, total.bawah);
      sel.value = {
        formula:
          `IF(${ref.sel(total.bawah)}=0,"",` +
          `${ref.sel(total.atas)}/${ref.sel(total.bawah)})`,
        result: bawah === 0 ? "" : atas / bawah,
      };
    }

    const format = formatKolom(kolom);
    if (format) sel.numFmt = format;
  }

  for (let kolomKe = 1; kolomKe <= definisi.kolom.length; kolomKe++) {
    baris.getCell(kolomKe).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: WARNA_TOTAL },
    };
  }
}

function jumlahkan(data: BarisNilai[], kunci: string) {
  return data.reduce((total, baris) => {
    const nilai = baris[kunci];
    return total + (typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0);
  }, 0);
}

/** Jumlah baris data per lembar — dipakai merakit rentang rumus antar-lembar. */
function ukuranDari(dataset: Dataset, isi: LembarTerbaca[]) {
  return new Map(
    dataset.lembar.map((lembar) => [
      lembar.nama,
      isi.find((item) => item.lembar === lembar.nama)?.baris.length ?? 0,
    ]),
  );
}

function buatRef(
  dataset: Dataset,
  lembar: Lembar,
  baris: number,
  jumlahBaris: Map<string, number>,
): RefRumus {
  const kolomDi = (namaLembar: string, kunci: string) => {
    const definisi = dataset.lembar.find((item) => item.nama === namaLembar);
    if (!definisi) throw new Error(`Lembar "${namaLembar}" tidak ada di dataset ${dataset.id}.`);
    const indeks = definisi.kolom.findIndex((kolom) => kolom.kunci === kunci);
    if (indeks === -1) {
      throw new Error(`Kolom "${kunci}" tidak ada di lembar "${namaLembar}".`);
    }
    return hurufKolom(indeks + 1);
  };
  // Lembar kosong tetap menghasilkan rentang yang sah (satu baris kosong),
  // supaya rumus lintas-lembar tidak menjadi #REF! saat datanya belum ada.
  const akhirDi = (namaLembar: string) =>
    Math.max(BARIS_AWAL, BARIS_AWAL + (jumlahBaris.get(namaLembar) ?? 0) - 1);

  const huruf = (kunci: string) => kolomDi(lembar.nama, kunci);
  const akhir = akhirDi(lembar.nama);

  return {
    baris,
    awal: BARIS_AWAL,
    akhir,
    sel: (kunci, barisKe = baris) => `${huruf(kunci)}${barisKe}`,
    rentang: (kunci) => `$${huruf(kunci)}$${BARIS_AWAL}:$${huruf(kunci)}$${akhir}`,
    rentangLembar: (namaLembar, kunci) => {
      const kolom = kolomDi(namaLembar, kunci);
      return `${namaLembarExcel(namaLembar)}!$${kolom}$${BARIS_AWAL}:$${kolom}$${akhirDi(namaLembar)}`;
    },
    kumulatif: (kunci) =>
      `SUM($${huruf(kunci)}$${BARIS_AWAL}:${huruf(kunci)}${baris})`,
  };
}

/** 1 → A, 26 → Z, 27 → AA. */
function hurufKolom(indeks: number) {
  let hasil = "";
  let sisa = indeks;
  while (sisa > 0) {
    const huruf = (sisa - 1) % 26;
    hasil = String.fromCharCode(65 + huruf) + hasil;
    sisa = Math.floor((sisa - 1) / 26);
  }
  return hasil;
}

/** Nama lembar dengan spasi harus dikutip di dalam rumus: `'Arus Kas'!A2`. */
function namaLembarExcel(nama: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(nama) ? nama : `'${nama.replace(/'/g, "''")}'`;
}

function formatKolom(kolom: Kolom) {
  if (kolom.format) return kolom.format;
  if (kolom.tipe === "persen") return FORMAT_PERSEN;
  // Kolom angka diberi format ribuan agar nilai besar mudah dibaca dan tetap
  // tersimpan sebagai angka, bukan teks.
  if (kolom.tipe === "angka") return FORMAT_ANGKA;
  return null;
}

function labelTipe(kolom: Kolom) {
  if (kolom.rumus) return "rumus";
  if (kolom.tipe === "angka") return "angka";
  if (kolom.tipe === "persen") return "persen";
  if (kolom.tipe === "ya-tidak") return "ya / tidak";
  return "teks";
}

function barisTotal(nilai: unknown) {
  const teks = ekstrakNilai(nilai);
  return typeof teks === "string" && teks.trim().toUpperCase() === LABEL_TOTAL;
}

/** Nilai tersimpan → sel Excel. Boolean ditulis "ya"/"tidak" agar rumus LOWER() cocok. */
function nilaiExcel(nilai: NilaiSelTersimpan, kolom: Kolom) {
  if (nilai === null || nilai === undefined) return null;
  if (kolom.tipe === "ya-tidak") return nilai === true ? "ya" : "tidak";
  return nilai;
}

type NilaiSelTersimpan = BarisNilai[string] | undefined;

function normalkan(teks: string) {
  return teks.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalkanNilai(nilai: unknown, kolom: Kolom): BarisNilai[string] {
  if (nilai === undefined || nilai === null || nilai === "") return null;
  if (kolom.tipe === "ya-tidak") return /^(ya|y|true|1|kritis)$/i.test(String(nilai).trim());
  if (kolom.tipe === "angka" || kolom.tipe === "persen") {
    return typeof nilai === "number" ? nilai : keAngka(String(nilai));
  }
  return String(nilai);
}

function bacaSel(nilai: unknown, kolom: Kolom): BarisNilai[string] {
  const mentah = ekstrakNilai(nilai);
  if (mentah === null || mentah === "") return null;

  if (kolom.tipe === "angka" || kolom.tipe === "persen") return keAngka(mentah);
  if (kolom.tipe === "ya-tidak") return /^(ya|y|true|1|kritis)$/i.test(String(mentah).trim());
  return String(mentah).trim();
}

function ekstrakNilai(nilai: unknown): string | number | null {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai === "number" || typeof nilai === "string") return nilai;
  if (typeof nilai === "boolean") return nilai ? "ya" : "tidak";
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

  let teks = nilai.replace(/[\s ]|Rp/gi, "");
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
