// Sample data for Bio District Cilenggang, ported from the Claude Design
// mockup (project/Harmoni Feasibility Studio.dc.html) — Tahap 1 static data.

export type StatusKind = "success" | "warning" | "danger" | "neutral";

export const PROJECT_INFO = {
  nama: "Bio District Cilenggang",
  lokasi: "Cilenggang, Serpong",
  luasLahan: "4.8 ha",
  tipe: "Perumahan tapak",
  jumlahUnit: "210 unit (tipe 36/72, 45/90)",
  targetHarga: "Rp 950 jt – 1.35 M / unit",
  durasiKonstruksi: "25 bulan",
  lajuSerapan: "7 unit / bulan",
};

export const BASE_NPV = 18.4;
export const BASE_IRR = 19.2;

export function computeNpv(sens: { harga: number; biaya: number; serapan: number }) {
  return (BASE_NPV + sens.harga * 0.09 - sens.biaya * 0.07 + sens.serapan * 0.05).toFixed(1);
}

export function computeIrr(sens: { harga: number; biaya: number; serapan: number }) {
  return (BASE_IRR + sens.harga * 0.08 - sens.biaya * 0.06 + sens.serapan * 0.04).toFixed(1);
}

export const SCENARIO_TABLE = [
  { name: "Optimis", npv: "24.1", irr: "23.4%", payback: "3.6 th" },
  { name: "Basis", npv: "18.4", irr: "19.2%", payback: "4.3 th" },
  { name: "Pesimis", npv: "9.8", irr: "13.1%", payback: "5.7 th" },
];

export const MATERIAL_SPECS: {
  kode: string; uraian: string; material: string; merek: string; standar: string;
  satuan: string; volume: number; harga: string; status: StatusKind; statusLabel: string;
}[] = [
  { kode: "STR-01", uraian: "Kolom beton bertulang", material: "Beton", merek: "Site mix", standar: "K-300 / SNI 2847", satuan: "m3", volume: 412, harga: "1.850.000", status: "success", statusLabel: "Sesuai standar ✓" },
  { kode: "STR-02", uraian: "Balok beton bertulang", material: "Beton", merek: "Site mix", standar: "K-250", satuan: "m3", volume: 318, harga: "1.780.000", status: "warning", statusLabel: "Perlu dicek" },
  { kode: "ARS-04", uraian: "Keramik lantai 60x60", material: "Granit tile", merek: "Niro Granite", standar: "SNI ISO 13006", satuan: "m2", volume: 5860, harga: "165.000", status: "success", statusLabel: "Sesuai standar ✓" },
  { kode: "MEP-11", uraian: "Pipa air bersih PVC", material: "PVC", merek: "Rucika", standar: "SNI 06-0084", satuan: "m", volume: 2140, harga: "42.000", status: "warning", statusLabel: "Perlu dicek" },
  { kode: "MEP-07", uraian: "Kabel NYM 3x2.5", material: "Tembaga", merek: "Supreme", standar: "SNI 04-6629", satuan: "m", volume: 8600, harga: "18.500", status: "success", statusLabel: "Sesuai standar ✓" },
  { kode: "INF-02", uraian: "Paving block K-300", material: "Beton", merek: "Site mix", standar: "-", satuan: "m2", volume: 3200, harga: "135.000", status: "neutral", statusLabel: "Tidak lengkap" },
];

export const CLASH_FINDINGS: {
  loc: string; disiplin: string; jenis: string; severity: "Tinggi" | "Sedang" | "Rendah";
  severityKind: StatusKind; status: string; pj: string;
}[] = [
  { loc: "Lt.2 / Grid C-4", disiplin: "MEP × Struktur", jenis: "Sparing tidak ada", severity: "Tinggi", severityKind: "danger", status: "Terbuka", pj: "Ir. Bayu (Struktur)" },
  { loc: "Lt.1 / Grid A-2", disiplin: "Arsitektur × MEP", jenis: "Ketidaksesuaian dimensi", severity: "Sedang", severityKind: "warning", status: "Ditinjau", pj: "Rani (Arsitektur)" },
  { loc: "Lt.3 / Grid B-6", disiplin: "Infrastruktur × Struktur", jenis: "Jarak bebas kurang", severity: "Sedang", severityKind: "warning", status: "Terbuka", pj: "Ir. Bayu (Struktur)" },
  { loc: "Lt.2 / Grid D-1", disiplin: "MEP × Arsitektur", jenis: "Fisik", severity: "Tinggi", severityKind: "danger", status: "Selesai", pj: "Dimas (MEP)" },
  { loc: "Lt.GF / Grid A-5", disiplin: "Infrastruktur × Arsitektur", jenis: "Jarak bebas kurang", severity: "Rendah", severityKind: "neutral", status: "Terbuka", pj: "Rani (Arsitektur)" },
];

export const COMPOSITE_FILES: {
  nama: string; disiplin: string; lantai: string; jenis: string; rev: string; tanggal: string;
  status: StatusKind; statusLabel: string;
}[] = [
  { nama: "STR-LT2-DENAH-R3.pdf", disiplin: "Struktur", lantai: "Lt.2", jenis: "Denah", rev: "R3", tanggal: "28 Jul 2026", status: "success", statusLabel: "Siap ditumpuk ✓" },
  { nama: "ARS-LT2-DENAH-R2.pdf", disiplin: "Arsitektur", lantai: "Lt.2", jenis: "Denah", rev: "R2", tanggal: "25 Jul 2026", status: "success", statusLabel: "Siap ditumpuk ✓" },
  { nama: "MEP-LT2-PLUMBING-R1.pdf", disiplin: "MEP", lantai: "Lt.2", jenis: "Denah", rev: "R1", tanggal: "30 Jul 2026", status: "warning", statusLabel: "Memproses…" },
  { nama: "INF-SITE-DRAINASE-R1.pdf", disiplin: "Infrastruktur", lantai: "Site", jenis: "Potongan", rev: "R1", tanggal: "22 Jul 2026", status: "success", statusLabel: "Siap ditumpuk ✓" },
];

export type LayerId = "struktur" | "arsitektur" | "mep" | "infrastruktur";

export const DEFAULT_LAYERS: { id: LayerId; label: string; color: string; visible: boolean; opacity: number }[] = [
  { id: "struktur", label: "Struktur", color: "#5b7a9e", visible: true, opacity: 100 },
  { id: "arsitektur", label: "Arsitektur", color: "#474238", visible: true, opacity: 80 },
  { id: "mep", label: "MEP", color: "#c67139", visible: true, opacity: 70 },
  { id: "infrastruktur", label: "Infrastruktur", color: "#7a8a5e", visible: false, opacity: 60 },
];

export const BOQ_DIVISIONS: { divisi: string; rab: string; pagu: string; selisih: string }[] = [
  { divisi: "Persiapan", rab: "4.2 M", pagu: "4.0 M", selisih: "+5.0%" },
  { divisi: "Struktur", rab: "58.6 M", pagu: "55.0 M", selisih: "+6.5%" },
  { divisi: "Arsitektur", rab: "41.3 M", pagu: "44.0 M", selisih: "-6.1%" },
  { divisi: "MEP", rab: "22.8 M", pagu: "21.5 M", selisih: "+6.0%" },
  { divisi: "Infrastruktur", rab: "15.7 M", pagu: "16.0 M", selisih: "-1.9%" },
];

export const ITP_LIST = [
  { item: "Beton struktur K-300", uji: "Uji tekan kubus 7/28 hari", frekuensi: "Tiap 5 m3 cor", kriteria: "≥ K-300 pada 28 hari", pj: "QC Lapangan" },
  { item: "Baja tulangan", uji: "Uji tarik & lengkung", frekuensi: "Tiap pengiriman", kriteria: "Sesuai SNI 2052", pj: "QC Lapangan" },
  { item: "Pipa air bersih", uji: "Uji tekan hidrostatik", frekuensi: "Tiap jalur utama", kriteria: "Tanpa kebocoran 30 menit", pj: "Supervisor MEP" },
];

export const WAKTU_ACTIVITIES: { aktivitas: string; durasi: string; mulai: string; selesai: string; kritis: boolean }[] = [
  { aktivitas: "Pekerjaan tanah & pondasi", durasi: "45 hari", mulai: "Minggu 1", selesai: "Minggu 7", kritis: true },
  { aktivitas: "Struktur lantai 1-3", durasi: "70 hari", mulai: "Minggu 6", selesai: "Minggu 16", kritis: true },
  { aktivitas: "Arsitektur & finishing", durasi: "60 hari", mulai: "Minggu 14", selesai: "Minggu 23", kritis: false },
  { aktivitas: "MEP & instalasi", durasi: "50 hari", mulai: "Minggu 15", selesai: "Minggu 22", kritis: false },
  { aktivitas: "Infrastruktur & serah terima", durasi: "20 hari", mulai: "Minggu 22", selesai: "Minggu 25", kritis: true },
];

export const DOCUMENTS: { nama: string; tipe: string; disiplin: string; ukuran: string; tanggal: string; status: StatusKind; statusLabel: string }[] = [
  { nama: "RKS Struktur Rev.2.pdf", tipe: "PDF", disiplin: "Struktur", ukuran: "4.2 MB", tanggal: "20 Jul 2026", status: "success", statusLabel: "Diproses ✓" },
  { nama: "Survei Harga Pasar Q3.xlsx", tipe: "Excel", disiplin: "-", ukuran: "860 KB", tanggal: "15 Jul 2026", status: "success", statusLabel: "Diproses ✓" },
  { nama: "BOQ Master Rev.1.xlsx", tipe: "Excel", disiplin: "-", ukuran: "1.1 MB", tanggal: "12 Jul 2026", status: "success", statusLabel: "Diproses ✓" },
  { nama: "Gambar MEP Plumbing R1.pdf", tipe: "PDF", disiplin: "MEP", ukuran: "6.7 MB", tanggal: "30 Jul 2026", status: "warning", statusLabel: "Memproses…" },
];

export const ACTIVITIES = [
  { text: "Gambar STR-LT2-DENAH-R3.pdf diunggah", time: "2 jam lalu" },
  { text: "Spesifikasi pipa air bersih direvisi", time: "5 jam lalu" },
  { text: "Temuan bentrok Lt.2/Grid C-4 dibuka", time: "1 hari lalu" },
  { text: "Asumsi biaya konstruksi per m² diperbarui", time: "2 hari lalu" },
];

export type BmwScenarioKey = "hemat" | "seimbang" | "cepat";

export const BMW_SCENARIOS: Record<BmwScenarioKey, { biaya: string; mutu: string; waktu: string; rekomendasi: string }> = {
  hemat: {
    biaya: "Rp 136.8 M (-4.1%)",
    mutu: "Standar minimum SNI",
    waktu: "26 bulan (+1)",
    rekomendasi: "Menghemat biaya dengan menurunkan spesifikasi non-struktural, namun menambah 1 bulan durasi karena pengadaan ulang. Cukup sejalan dengan hasil Studi Kelayakan bila target penjualan tercapai tepat waktu.",
  },
  seimbang: {
    biaya: "Rp 142.6 M (basis)",
    mutu: "Sesuai RKS",
    waktu: "25 bulan (basis)",
    rekomendasi: "Skenario paling sejalan dengan hasil Studi Kelayakan — menjaga margin NPV 18.4 M tanpa menambah risiko jadwal pada jalur kritis.",
  },
  cepat: {
    biaya: "Rp 151.2 M (+6.0%)",
    mutu: "Sesuai RKS + percepatan",
    waktu: "22 bulan (-3)",
    rekomendasi: "Mempercepat serah terima 3 bulan lewat lembur & multi-supplier, menaikkan biaya konstruksi. Layak bila laju serapan penjualan naik sebanding.",
  },
};
