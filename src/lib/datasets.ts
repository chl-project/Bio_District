// Definisi kumpulan data yang bisa diisi lewat template Excel.
//
// Satu definisi dipakai untuk empat hal sekaligus: menghasilkan template unduhan,
// memvalidasi berkas yang diunggah, menampilkan tabelnya, dan menulis kembali
// hasil olahan sebagai berkas Excel. Menaruhnya di satu tempat mencegah keempatnya
// berbeda kolom — sumber kesalahan yang tidak kelihatan sampai datanya masuk
// salah kolom.
//
// Kolom hasil hitungan (`rumus`) ditulis dua kali dengan sengaja: sebagai rumus
// Excel yang hidup di dalam berkas — supaya penerima bisa melihat dan menelusuri
// perhitungannya di bilah rumus, persis seperti lembar monitoring yang dipakai
// di lapangan — dan sebagai fungsi TypeScript yang menghasilkan angka yang sama
// untuk tabel di layar, ringkasan, dan analisa AI. Keduanya harus tetap sepadan;
// bila salah satu diubah, ubah pasangannya.

export type TipeKolom = "teks" | "angka" | "ya-tidak" | "persen";

export type NilaiSel = string | number | boolean | null;
export type BarisNilai = Record<string, NilaiSel>;

/** Alamat sel dan rentang untuk merakit rumus Excel pada satu baris tertentu. */
export type RefRumus = {
  /** Nomor baris Excel yang sedang ditulis. */
  baris: number;
  /** Nomor baris data pertama (di bawah baris judul). */
  awal: number;
  /** Nomor baris data terakhir. */
  akhir: number;
  /** Alamat sel kolom `kunci`, mis. `E5`. Baris lain bisa disebut eksplisit. */
  sel: (kunci: string, baris?: number) => string;
  /** Rentang absolut satu kolom sepanjang data di lembar ini, mis. `$E$2:$E$7`. */
  rentang: (kunci: string) => string;
  /** Rentang absolut satu kolom di lembar lain, mis. `Asumsi!$B$2:$B$12`. */
  rentangLembar: (lembar: string, kunci: string) => string;
  /** Akumulasi dari baris pertama sampai baris ini, mis. `SUM($F$2:F5)`. */
  kumulatif: (kunci: string) => string;
};

/** Data lain yang boleh dilihat sebuah rumus saat dihitung di sisi server. */
export type KonteksHitung = {
  /** Baris pada lembar mana pun dalam dataset yang sama. */
  lembar: (nama: string) => BarisNilai[];
  /** Baris sebelum baris ini pada lembar yang sedang dihitung — untuk kolom kumulatif. */
  sebelumnya: BarisNilai[];
};

export type Rumus = {
  /** Penjelasan singkat memakai nama kolom, ditampilkan di layar dan lembar Petunjuk. */
  teks: string;
  /** Rumus Excel tanpa tanda sama dengan, dirakit untuk satu baris. */
  excel: (ref: RefRumus) => string;
  /** Perhitungan setara di sisi server; hasilnya ikut tersimpan dan ditampilkan. */
  hitung: (baris: BarisNilai, konteks: KonteksHitung) => number | null;
};

/** Isi sel kolom ini pada baris TOTAL di bawah data. */
export type Total =
  | { jenis: "jumlah" }
  | { jenis: "rasio"; atas: string; bawah: string };

export type Kolom = {
  kunci: string;
  judul: string;
  tipe: TipeKolom;
  wajib?: boolean;
  lebar?: number;
  /** Format angka Excel; bila kosong dipakai bawaan menurut tipe. */
  format?: string;
  /** Ada isinya berarti kolom hasil hitungan — tidak diisi manual. */
  rumus?: Rumus;
  total?: Total;
};

export type Lembar = {
  nama: string;
  keterangan: string;
  kolom: Kolom[];
  /** Nilai pembuka, sejajar dengan kolom isian saja (kolom rumus tidak ikut). */
  contoh: (string | number)[][];
};

export type Dataset = {
  id: string;
  judul: string;
  keterangan: string;
  lembar: Lembar[];
};

const teks = (kunci: string, judul: string, lebar = 22, wajib = false): Kolom => ({
  kunci, judul, tipe: "teks", lebar, wajib,
});
const angka = (kunci: string, judul: string, lebar = 16, wajib = false): Kolom => ({
  kunci, judul, tipe: "angka", lebar, wajib,
});
/** Kolom angka yang ikut dijumlahkan di baris TOTAL. */
const jumlah = (kunci: string, judul: string, lebar = 16): Kolom => ({
  ...angka(kunci, judul, lebar),
  total: { jenis: "jumlah" },
});
/** Kolom hasil hitungan. */
const hasil = (
  kunci: string,
  judul: string,
  rumus: Rumus,
  opsi: Partial<Kolom> = {},
): Kolom => ({ kunci, judul, tipe: "angka", lebar: 20, ...opsi, rumus });

const nol = (nilai: NilaiSel) =>
  typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0;

/** Nilai satu parameter di lembar Asumsi, dicocokkan dengan pencocokan longgar. */
function asumsi(konteks: KonteksHitung, kata: string) {
  return konteks
    .lembar("Asumsi")
    .filter((row) => String(row.parameter ?? "").toLowerCase().includes(kata))
    .reduce((total, row) => total + nol(row.nilai), 0);
}

/** Padanan Excel dari `asumsi()`: SUMIF dengan wildcard atas kolom Parameter. */
const asumsiExcel = (ref: RefRumus, kata: string) =>
  `SUMIF(${ref.rentangLembar("Asumsi", "parameter")},"*${kata}*",` +
  `${ref.rentangLembar("Asumsi", "nilai")})`;

/** Diskonto 12% dipakai bila lembar Asumsi tidak memuat barisnya sama sekali. */
const DISKONTO_BAWAAN = 0.12;

export const DATASETS: Record<string, Dataset> = {
  "studi-kelayakan": {
    id: "studi-kelayakan",
    judul: "Studi Kelayakan",
    keterangan:
      "Asumsi dasar, proyeksi arus kas, data pasar, dan status perizinan. " +
      "NPV, IRR, dan payback dihitung dari lembar Arus Kas.",
    lembar: [
      {
        nama: "Asumsi",
        keterangan: "Parameter dasar yang dipakai seluruh perhitungan.",
        kolom: [
          teks("parameter", "Parameter", 30, true),
          angka("nilai", "Nilai", 16, true),
          teks("satuan", "Satuan", 14),
          teks("sumber", "Sumber", 26),
          teks("catatan", "Catatan", 34),
        ],
        contoh: [
          ["Luas lahan", 4.8, "ha", "Sertifikat HGB-1122/CLG", "Termasuk sempadan sungai sisi timur"],
          ["Luas efektif kavling", 2.88, "ha", "Siteplan Rev.2", "60% dari luas lahan, sisanya jalan & fasum"],
          ["Jumlah unit", 210, "unit", "Siteplan Rev.2", "84 unit tipe 36/72, 126 unit tipe 45/90"],
          ["Harga jual rata-rata", 1_230_000_000, "Rp/unit", "Survei pasar Q3 2026", "40% tipe 36/72 @1.05 M, 60% tipe 45/90 @1.35 M"],
          ["Laju serapan", 7, "unit/bulan", "Survei pasar Q3 2026", "Asumsi basis; rentang 6-8 unit/bulan"],
          ["Durasi konstruksi", 25, "bulan", "Master schedule Rev.1", "Jalur kritis: tanah, struktur, serah terima"],
          ["Biaya bangunan per unit", 380_000_000, "Rp/unit", "RAB Rev.1", "Rata-rata tertimbang tipe 36/72 dan 45/90"],
          ["Biaya konstruksi", 115_000_000_000, "Rp", "RAB Rev.1", "210 unit x 380 jt + 35 M infrastruktur kawasan"],
          ["Biaya lahan & perizinan", 55_000_000_000, "Rp", "Akta jual beli 2024 + estimasi izin", "Nilai perolehan 2024; harga pasar kini lebih tinggi"],
          ["Marketing & overhead", 34_000_000_000, "Rp", "Rencana anggaran pemasaran", "~13% dari pendapatan, termasuk biaya pendanaan"],
          ["Tingkat diskonto", 12, "%/tahun", "Kebijakan internal CHL", "Dipakai untuk perhitungan NPV"],
        ],
      },
      {
        nama: "Arus Kas",
        keterangan:
          "Satu baris per tahun. Isi tiga kolom biaya dan pendapatannya saja — " +
          "arus kas bersih, kumulatif, faktor diskonto, dan nilai kini terisi rumus.",
        kolom: [
          angka("tahun", "Tahun", 10, true),
          jumlah("pendapatan", "Pendapatan", 20),
          jumlah("biaya_investasi", "Biaya investasi", 20),
          jumlah("biaya_operasional", "Biaya operasional", 20),
          hasil(
            "arus_kas_bersih",
            "Arus kas bersih",
            {
              teks: "Pendapatan − Biaya investasi − Biaya operasional",
              excel: (ref) =>
                `${ref.sel("pendapatan")}-${ref.sel("biaya_investasi")}` +
                `-${ref.sel("biaya_operasional")}`,
              hitung: (baris) =>
                nol(baris.pendapatan) - nol(baris.biaya_investasi) - nol(baris.biaya_operasional),
            },
            { lebar: 20, total: { jenis: "jumlah" } },
          ),
          hasil(
            "arus_kas_kumulatif",
            "Arus kas kumulatif",
            {
              teks: "Jumlah arus kas bersih dari tahun pertama sampai baris ini",
              excel: (ref) => ref.kumulatif("arus_kas_bersih"),
              hitung: (baris, konteks) =>
                konteks.sebelumnya.reduce((total, row) => total + nol(row.arus_kas_bersih), 0) +
                nol(baris.arus_kas_bersih),
            },
            { lebar: 22 },
          ),
          hasil(
            "faktor_diskonto",
            "Faktor diskonto",
            {
              teks:
                "1 ÷ (1 + tingkat diskonto)^Tahun — tingkat diskonto diambil dari " +
                "lembar Asumsi, 12% bila barisnya tidak ada",
              excel: (ref) => {
                const tarif = asumsiExcel(ref, "diskonto");
                return `1/(1+IF(${tarif}=0,${DISKONTO_BAWAAN},${tarif}/100))^${ref.sel("tahun")}`;
              },
              hitung: (baris, konteks) => {
                const tarif = asumsi(konteks, "diskonto");
                const diskonto = tarif === 0 ? DISKONTO_BAWAAN : tarif / 100;
                return 1 / (1 + diskonto) ** nol(baris.tahun);
              },
            },
            { lebar: 16, format: "0.0000" },
          ),
          hasil(
            "nilai_kini",
            "Nilai kini (PV)",
            {
              teks: "Arus kas bersih × Faktor diskonto — jumlah kolom ini adalah NPV",
              excel: (ref) => `${ref.sel("arus_kas_bersih")}*${ref.sel("faktor_diskonto")}`,
              hitung: (baris) => nol(baris.arus_kas_bersih) * nol(baris.faktor_diskonto),
            },
            { lebar: 22, total: { jenis: "jumlah" } },
          ),
        ],
        // Pendapatan total sengaja sama dengan jumlah unit dikali harga rata-rata
        // di lembar Asumsi, dan biaya konstruksinya sama dengan asumsi RAB —
        // angka pembuka yang tidak konsisten hanya melatih orang mengabaikannya.
        contoh: [
          [0, 0, 55_000_000_000, 0],
          [1, 41_000_000_000, 35_000_000_000, 6_000_000_000],
          [2, 75_000_000_000, 42_000_000_000, 9_000_000_000],
          [3, 77_000_000_000, 28_000_000_000, 8_000_000_000],
          [4, 47_000_000_000, 10_000_000_000, 7_000_000_000],
          [5, 18_300_000_000, 0, 4_000_000_000],
        ],
      },
      {
        nama: "Pasar",
        keterangan: "Pembanding harga di sekitar lokasi.",
        kolom: [
          teks("segmen", "Segmen", 24, true),
          teks("pesaing", "Proyek pembanding", 28),
          angka("harga", "Harga (Rp/unit)", 22),
          angka("serapan", "Serapan (unit/bln)", 20),
          hasil(
            "selisih_harga",
            "Selisih thd harga rencana",
            {
              teks:
                "(Harga pembanding − Harga jual rata-rata di Asumsi) ÷ Harga jual rata-rata",
              excel: (ref) => {
                const rencana = asumsiExcel(ref, "harga jual");
                return `IF(${rencana}=0,"",(${ref.sel("harga")}-${rencana})/${rencana})`;
              },
              hitung: (baris, konteks) => {
                const rencana = asumsi(konteks, "harga jual");
                return rencana === 0 ? null : (nol(baris.harga) - rencana) / rencana;
              },
            },
            { lebar: 24, tipe: "persen" },
          ),
          teks("catatan", "Catatan", 34),
        ],
        contoh: [
          ["Tipe 36/72", "Griya Serpong Asri", 950_000_000, 6, "Jarak 1.2 km, fasilitas standar"],
          ["Tipe 36/72", "Cluster Melati Residence", 1_020_000_000, 5, "Jarak 2.4 km, sudah serah terima penuh"],
          ["Tipe 45/90", "Cluster Bukit Indah", 1_350_000_000, 4, "Jarak 1.8 km, fasilitas lebih lengkap"],
          ["Tipe 45/90", "Serpong Garden Estate", 1_420_000_000, 3, "Jarak 3.1 km, akses tol lebih dekat"],
        ],
      },
      {
        nama: "Legal",
        keterangan: "Status dokumen perizinan.",
        kolom: [
          teks("dokumen", "Dokumen", 28, true),
          teks("status", "Status", 18),
          teks("nomor", "Nomor", 24),
          teks("tanggal", "Tanggal terbit", 18),
          teks("catatan", "Catatan", 34),
        ],
        contoh: [
          ["Sertifikat HGB", "Terbit", "HGB-1122/CLG", "2024-03-11", "Berlaku s.d. 2043 a.n. Cipta Harmoni Lestari"],
          ["PKKPR", "Terbit", "PKKPR-0457/TNG/2025", "2025-06-02", "Zona perumahan kepadatan sedang"],
          ["Pengesahan siteplan", "Terbit", "SP-089/DPUPR/2025", "2025-04-22", "KDB 60%, KLB 1.2, GSB 4 m"],
          ["Persetujuan Lingkungan (SPPL)", "Terbit", "SPPL-231/DLH/2025", "2025-08-14", ""],
          ["PBG", "Proses", "-", "", "Menunggu rekomendasi TABG, perkiraan 2 bulan"],
          ["Izin pelebaran akses jalan", "Proses", "-", "", "Menunggu persetujuan Dinas PU — risiko jadwal"],
        ],
      },
    ],
  },

  "spesifikasi-material": {
    id: "spesifikasi-material",
    judul: "Spesifikasi Material",
    keterangan:
      "Rincian material dari RKS beserta alternatif penggantinya. " +
      "Nilai total dihitung dari volume dikali harga satuan.",
    lembar: [
      {
        nama: "Spesifikasi",
        keterangan: "Satu baris per item material dalam RKS.",
        kolom: [
          teks("kode", "Kode", 12, true),
          teks("uraian", "Uraian", 34, true),
          teks("material", "Material", 18),
          teks("merek", "Merek", 18),
          teks("standar", "Standar / SNI", 24),
          teks("satuan", "Satuan", 10),
          angka("volume", "Volume", 14),
          angka("harga_satuan", "Harga satuan (Rp)", 20),
          hasil(
            "nilai",
            "Nilai (Rp)",
            {
              teks: "Volume × Harga satuan",
              excel: (ref) => `${ref.sel("volume")}*${ref.sel("harga_satuan")}`,
              hitung: (baris) => nol(baris.volume) * nol(baris.harga_satuan),
            },
            { lebar: 22, total: { jenis: "jumlah" } },
          ),
        ],
        contoh: [
          ["STR-01", "Kolom beton bertulang", "Beton", "Site mix", "K-300 / SNI 2847", "m3", 412, 1850000],
          ["ARS-04", "Keramik lantai 60x60", "Granit tile", "Niro Granite", "SNI ISO 13006", "m2", 5860, 165000],
          ["MEP-11", "Pipa air bersih PVC", "PVC", "Rucika", "SNI 06-0084", "m", 2140, 42000],
        ],
      },
      {
        nama: "Alternatif",
        keterangan:
          "Pilihan pengganti untuk item di lembar Spesifikasi. " +
          "Kode harus sama persis agar bisa dipasangkan — harga asal, selisih, " +
          "dan potensi hemat diambil dari lembar Spesifikasi lewat rumus.",
        kolom: [
          teks("kode", "Kode", 12, true),
          teks("merek", "Merek alternatif", 22, true),
          teks("standar", "Standar / SNI", 24),
          angka("harga_satuan", "Harga satuan (Rp)", 20),
          hasil(
            "harga_asal",
            "Harga satuan asal (Rp)",
            {
              teks: "Harga satuan di lembar Spesifikasi untuk Kode yang sama",
              excel: (ref) =>
                `SUMIF(${ref.rentangLembar("Spesifikasi", "kode")},${ref.sel("kode")},` +
                `${ref.rentangLembar("Spesifikasi", "harga_satuan")})`,
              hitung: (baris, konteks) =>
                konteks
                  .lembar("Spesifikasi")
                  .filter((row) => row.kode === baris.kode)
                  .reduce((total, row) => total + nol(row.harga_satuan), 0),
            },
            { lebar: 22 },
          ),
          hasil(
            "selisih_satuan",
            "Selisih harga satuan (Rp)",
            {
              teks: "Harga satuan asal − Harga satuan alternatif",
              excel: (ref) =>
                `IF(${ref.sel("harga_asal")}=0,"",` +
                `${ref.sel("harga_asal")}-${ref.sel("harga_satuan")})`,
              hitung: (baris) =>
                nol(baris.harga_asal) === 0
                  ? null
                  : nol(baris.harga_asal) - nol(baris.harga_satuan),
            },
            { lebar: 24 },
          ),
          hasil(
            "potensi_hemat",
            "Potensi hemat (Rp)",
            {
              teks:
                "Selisih harga satuan × Volume item asal, dibatasi minimal nol — " +
                "alternatif yang lebih mahal tidak dihitung sebagai penghematan",
              excel: (ref) =>
                `IF(${ref.sel("harga_asal")}=0,"",MAX(0,${ref.sel("selisih_satuan")}*` +
                `SUMIF(${ref.rentangLembar("Spesifikasi", "kode")},${ref.sel("kode")},` +
                `${ref.rentangLembar("Spesifikasi", "volume")})))`,
              hitung: (baris, konteks) => {
                if (nol(baris.harga_asal) === 0) return null;
                const volume = konteks
                  .lembar("Spesifikasi")
                  .filter((row) => row.kode === baris.kode)
                  .reduce((total, row) => total + nol(row.volume), 0);
                return Math.max(0, nol(baris.selisih_satuan) * volume);
              },
            },
            { lebar: 22, total: { jenis: "jumlah" } },
          ),
          teks("konsekuensi", "Konsekuensi mutu", 38),
        ],
        contoh: [
          ["ARS-04", "Roman Granit", "SNI ISO 13006", 148000, "Setara, variasi warna lebih sedikit"],
          ["MEP-11", "Wavin", "SNI 06-0084", 45500, "Setara, ketersediaan lebih baik"],
        ],
      },
    ],
  },

  "analisa-bmw": {
    id: "analisa-bmw",
    judul: "Analisa Biaya–Mutu–Waktu",
    keterangan:
      "BOQ/RAB, rencana mutu, dan jadwal. Selisih terhadap pagu serta " +
      "durasi jalur kritis dihitung otomatis.",
    lembar: [
      {
        nama: "BOQ",
        keterangan:
          "Satu baris per item pekerjaan. RAB, selisih terhadap pagu, dan " +
          "persentasenya terisi rumus — cukup isi volume, harga satuan, dan pagu.",
        kolom: [
          teks("divisi", "Divisi", 20, true),
          teks("kode", "Kode", 12),
          teks("uraian", "Uraian pekerjaan", 34, true),
          teks("satuan", "Satuan", 10),
          angka("volume", "Volume", 14),
          angka("harga_satuan", "Harga satuan (Rp)", 20),
          hasil(
            "rab",
            "RAB (Rp)",
            {
              teks: "Volume × Harga satuan",
              excel: (ref) => `${ref.sel("volume")}*${ref.sel("harga_satuan")}`,
              hitung: (baris) => nol(baris.volume) * nol(baris.harga_satuan),
            },
            { lebar: 22, total: { jenis: "jumlah" } },
          ),
          jumlah("pagu", "Pagu (Rp)", 20),
          hasil(
            "selisih_pagu",
            "Selisih thd pagu (Rp)",
            {
              teks: "RAB − Pagu — positif berarti melebihi pagu",
              excel: (ref) => `${ref.sel("rab")}-${ref.sel("pagu")}`,
              hitung: (baris) => nol(baris.rab) - nol(baris.pagu),
            },
            { lebar: 22, total: { jenis: "jumlah" } },
          ),
          hasil(
            "selisih_persen",
            "Selisih thd pagu (%)",
            {
              teks: "Selisih thd pagu ÷ Pagu",
              excel: (ref) =>
                `IF(${ref.sel("pagu")}=0,"",${ref.sel("selisih_pagu")}/${ref.sel("pagu")})`,
              hitung: (baris) =>
                nol(baris.pagu) === 0 ? null : nol(baris.selisih_pagu) / nol(baris.pagu),
            },
            {
              lebar: 20,
              tipe: "persen",
              total: { jenis: "rasio", atas: "selisih_pagu", bawah: "pagu" },
            },
          ),
        ],
        // Pagu diisi per item, sejajar dengan RAB = volume x harga satuan.
        // Mengisinya dengan total divisi membuat selisihnya tampak ekstrem palsu.
        contoh: [
          ["Persiapan", "PRS-01", "Pembersihan lahan", "m2", 48000, 12500, 620000000],
          ["Struktur", "STR-01", "Kolom beton K-300", "m3", 412, 1850000, 730000000],
          ["Arsitektur", "ARS-04", "Keramik lantai 60x60", "m2", 5860, 165000, 1000000000],
          ["MEP", "MEP-11", "Pipa air bersih PVC", "m", 2140, 42000, 88000000],
        ],
      },
      {
        nama: "Mutu",
        keterangan: "Rencana inspeksi dan pengujian (ITP).",
        kolom: [
          teks("item", "Item pekerjaan", 30, true),
          teks("uji", "Jenis pengujian", 30),
          teks("frekuensi", "Frekuensi", 24),
          teks("kriteria", "Kriteria terima", 30),
          teks("penanggung_jawab", "Penanggung jawab", 22),
        ],
        contoh: [
          ["Beton struktur K-300", "Uji tekan kubus 7/28 hari", "Tiap 5 m3 cor", "≥ K-300 pada 28 hari", "QC Lapangan"],
          ["Baja tulangan", "Uji tarik & lengkung", "Tiap pengiriman", "Sesuai SNI 2052", "QC Lapangan"],
        ],
      },
      {
        nama: "Jadwal",
        keterangan:
          "Satu baris per aktivitas. Isi kolom Kritis dengan ya atau tidak; " +
          "durasi jalur kritis dijumlahkan lewat rumus dari baris yang bernilai ya.",
        kolom: [
          teks("aktivitas", "Aktivitas", 34, true),
          jumlah("durasi_hari", "Durasi (hari)", 16),
          angka("mulai_minggu", "Mulai (minggu ke-)", 20),
          angka("selesai_minggu", "Selesai (minggu ke-)", 20),
          { kunci: "kritis", judul: "Kritis (ya/tidak)", tipe: "ya-tidak", lebar: 18 },
          hasil(
            "rentang_minggu",
            "Rentang (minggu)",
            {
              teks: "Selesai (minggu ke-) − Mulai (minggu ke-)",
              excel: (ref) => `${ref.sel("selesai_minggu")}-${ref.sel("mulai_minggu")}`,
              hitung: (baris) => nol(baris.selesai_minggu) - nol(baris.mulai_minggu),
            },
            { lebar: 18 },
          ),
          hasil(
            "durasi_kritis",
            "Durasi kritis (hari)",
            {
              teks: "Durasi (hari) bila kolom Kritis berisi ya, selain itu nol",
              excel: (ref) =>
                `IF(LOWER(${ref.sel("kritis")})="ya",${ref.sel("durasi_hari")},0)`,
              hitung: (baris) => (baris.kritis === true ? nol(baris.durasi_hari) : 0),
            },
            { lebar: 20, total: { jenis: "jumlah" } },
          ),
        ],
        contoh: [
          ["Pekerjaan tanah & pondasi", 45, 1, 7, "ya"],
          ["Struktur lantai 1-3", 70, 6, 16, "ya"],
          ["Arsitektur & finishing", 60, 14, 23, "tidak"],
          ["MEP & instalasi", 50, 15, 22, "tidak"],
          ["Infrastruktur & serah terima", 20, 22, 25, "ya"],
        ],
      },
    ],
  },
};

/** Kolom yang diisi manual — urutannya sejajar dengan `Lembar.contoh`. */
export function kolomIsian(lembar: Lembar) {
  return lembar.kolom.filter((kolom) => !kolom.rumus);
}

/** Kolom hasil hitungan, beserta rumusnya. */
export function kolomRumus(lembar: Lembar) {
  return lembar.kolom.filter((kolom) => kolom.rumus);
}

export function ambilDataset(id: string): Dataset | null {
  return DATASETS[id] ?? null;
}

export function namaBerkasTemplate(dataset: Dataset) {
  return `Template ${dataset.judul}.xlsx`;
}

export function namaBerkasHasil(dataset: Dataset) {
  return `Hasil Olahan ${dataset.judul}.xlsx`;
}
