// Definisi kumpulan data yang bisa diisi lewat template Excel.
//
// Satu definisi dipakai untuk tiga hal sekaligus: menghasilkan template unduhan,
// memvalidasi berkas yang diunggah, dan menampilkan tabelnya. Menaruhnya di satu
// tempat mencegah ketiganya berbeda kolom — sumber kesalahan yang tidak kelihatan
// sampai datanya masuk salah kolom.

export type TipeKolom = "teks" | "angka" | "ya-tidak";

export type Kolom = {
  kunci: string;
  judul: string;
  tipe: TipeKolom;
  wajib?: boolean;
  lebar?: number;
};

export type Lembar = {
  nama: string;
  keterangan: string;
  kolom: Kolom[];
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
          "Satu baris per tahun. Arus kas bersih dihitung otomatis " +
          "(pendapatan dikurangi investasi dan biaya operasional) bila dikosongkan.",
        kolom: [
          angka("tahun", "Tahun", 10, true),
          angka("pendapatan", "Pendapatan", 20),
          angka("biaya_investasi", "Biaya investasi", 20),
          angka("biaya_operasional", "Biaya operasional", 20),
          angka("arus_kas_bersih", "Arus kas bersih", 20),
        ],
        // Pendapatan total sengaja sama dengan jumlah unit dikali harga rata-rata
        // di lembar Asumsi, dan biaya konstruksinya sama dengan asumsi RAB —
        // angka pembuka yang tidak konsisten hanya melatih orang mengabaikannya.
        contoh: [
          [0, 0, 55_000_000_000, 0, ""],
          [1, 41_000_000_000, 35_000_000_000, 6_000_000_000, ""],
          [2, 75_000_000_000, 42_000_000_000, 9_000_000_000, ""],
          [3, 77_000_000_000, 28_000_000_000, 8_000_000_000, ""],
          [4, 47_000_000_000, 10_000_000_000, 7_000_000_000, ""],
          [5, 18_300_000_000, 0, 4_000_000_000, ""],
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
          "Kode harus sama persis agar bisa dipasangkan.",
        kolom: [
          teks("kode", "Kode", 12, true),
          teks("merek", "Merek alternatif", 22, true),
          teks("standar", "Standar / SNI", 24),
          angka("harga_satuan", "Harga satuan (Rp)", 20),
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
        keterangan: "Satu baris per item pekerjaan. RAB = volume x harga satuan.",
        kolom: [
          teks("divisi", "Divisi", 20, true),
          teks("kode", "Kode", 12),
          teks("uraian", "Uraian pekerjaan", 34, true),
          teks("satuan", "Satuan", 10),
          angka("volume", "Volume", 14),
          angka("harga_satuan", "Harga satuan (Rp)", 20),
          angka("pagu", "Pagu (Rp)", 20),
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
          "total durasi jalur kritis dihitung dari baris yang bernilai ya.",
        kolom: [
          teks("aktivitas", "Aktivitas", 34, true),
          angka("durasi_hari", "Durasi (hari)", 16),
          angka("mulai_minggu", "Mulai (minggu ke-)", 20),
          angka("selesai_minggu", "Selesai (minggu ke-)", 20),
          { kunci: "kritis", judul: "Kritis (ya/tidak)", tipe: "ya-tidak", lebar: 18 },
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

export function ambilDataset(id: string): Dataset | null {
  return DATASETS[id] ?? null;
}

export function namaBerkasTemplate(dataset: Dataset) {
  return `Template ${dataset.judul}.xlsx`;
}
