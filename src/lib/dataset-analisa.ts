import type { BarisTersimpan } from "./dataset-store";

export type Ringkasan = { label: string; nilai: string; nada?: "baik" | "waspada" | "buruk" };

function baris(data: BarisTersimpan[], lembar: string) {
  return data.filter((item) => item.lembar === lembar).map((item) => item.data);
}

function angka(nilai: unknown): number {
  return typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0;
}

function rupiah(nilai: number) {
  const absolut = Math.abs(nilai);
  if (absolut >= 1e12) return `Rp ${(nilai / 1e12).toFixed(2)} T`;
  if (absolut >= 1e9) return `Rp ${(nilai / 1e9).toFixed(1)} M`;
  if (absolut >= 1e6) return `Rp ${(nilai / 1e6).toFixed(1)} jt`;
  return `Rp ${Math.round(nilai).toLocaleString("id-ID")}`;
}

function persen(nilai: number) {
  return `${(nilai * 100).toFixed(1)}%`;
}

/** Arus kas bersih per tahun; dipakai NPV, IRR, dan payback. */
function arusKas(data: BarisTersimpan[]) {
  return baris(data, "Arus Kas")
    .map((row) => ({
      tahun: angka(row.tahun),
      bersih:
        row.arus_kas_bersih !== null && row.arus_kas_bersih !== undefined
          ? angka(row.arus_kas_bersih)
          : angka(row.pendapatan) - angka(row.biaya_investasi) - angka(row.biaya_operasional),
    }))
    .sort((a, b) => a.tahun - b.tahun);
}

function npv(alir: number[], diskonto: number) {
  return alir.reduce((total, nilai, tahun) => total + nilai / (1 + diskonto) ** tahun, 0);
}

/**
 * IRR lewat bisection. Metode ini dipilih karena selalu konvergen selama ada
 * pergantian tanda — tidak seperti Newton-Raphson yang bisa melenceng pada
 * pola arus kas tak lazim. Mengembalikan null bila tidak ada akar di rentang wajar.
 */
function irr(alir: number[]): number | null {
  if (alir.length < 2) return null;

  let bawah = -0.9;
  let atas = 10;
  let nilaiBawah = npv(alir, bawah);
  if (nilaiBawah * npv(alir, atas) > 0) return null;

  for (let i = 0; i < 200; i++) {
    const tengah = (bawah + atas) / 2;
    const nilaiTengah = npv(alir, tengah);
    if (Math.abs(nilaiTengah) < 1) return tengah;
    if (nilaiBawah * nilaiTengah < 0) {
      atas = tengah;
    } else {
      bawah = tengah;
      nilaiBawah = nilaiTengah;
    }
  }
  return (bawah + atas) / 2;
}

/** Titik impas kumulatif, diinterpolasi di dalam tahun berjalan. */
function payback(alir: number[]): number | null {
  let kumulatif = 0;
  for (let tahun = 0; tahun < alir.length; tahun++) {
    const sebelum = kumulatif;
    kumulatif += alir[tahun];
    if (sebelum < 0 && kumulatif >= 0) {
      return tahun - 1 + Math.abs(sebelum) / Math.abs(alir[tahun]);
    }
  }
  return null;
}

export function hitungRingkasan(dataset: string, data: BarisTersimpan[]): Ringkasan[] {
  if (data.length === 0) return [];

  if (dataset === "studi-kelayakan") {
    const asumsi = baris(data, "Asumsi");
    const diskontoBaris = asumsi.find((row) =>
      String(row.parameter ?? "").toLowerCase().includes("diskonto"),
    );
    const diskonto = diskontoBaris ? angka(diskontoBaris.nilai) / 100 : 0.12;

    const alir = arusKas(data);
    if (alir.length === 0) return [{ label: "Arus kas", nilai: "belum diisi" }];

    const nilai = alir.map((item) => item.bersih);
    const hasilNpv = npv(nilai, diskonto);
    const hasilIrr = irr(nilai);
    const hasilPayback = payback(nilai);

    return [
      {
        label: `NPV (diskonto ${(diskonto * 100).toFixed(1)}%)`,
        nilai: rupiah(hasilNpv),
        nada: hasilNpv > 0 ? "baik" : "buruk",
      },
      {
        label: "IRR",
        nilai: hasilIrr === null ? "tak terdefinisi" : persen(hasilIrr),
        nada: hasilIrr === null ? undefined : hasilIrr > diskonto ? "baik" : "buruk",
      },
      {
        label: "Payback",
        nilai: hasilPayback === null ? "belum balik modal" : `${hasilPayback.toFixed(1)} tahun`,
        nada: hasilPayback === null ? "buruk" : undefined,
      },
      { label: "Periode proyeksi", nilai: `${alir.length} tahun` },
    ];
  }

  if (dataset === "spesifikasi-material") {
    const spesifikasi = baris(data, "Spesifikasi");
    const alternatif = baris(data, "Alternatif");

    const total = spesifikasi.reduce(
      (jumlah, row) => jumlah + angka(row.volume) * angka(row.harga_satuan),
      0,
    );

    // Penghematan dihitung hanya untuk item yang punya alternatif lebih murah.
    let hemat = 0;
    for (const alt of alternatif) {
      const asal = spesifikasi.find((row) => row.kode === alt.kode);
      if (!asal) continue;
      const selisih = (angka(asal.harga_satuan) - angka(alt.harga_satuan)) * angka(asal.volume);
      if (selisih > 0) hemat += selisih;
    }

    const tanpaStandar = spesifikasi.filter((row) => !String(row.standar ?? "").trim()).length;

    return [
      { label: "Item material", nilai: String(spesifikasi.length) },
      { label: "Nilai spesifikasi", nilai: rupiah(total) },
      {
        label: "Potensi hemat dari alternatif",
        nilai: rupiah(hemat),
        nada: hemat > 0 ? "baik" : undefined,
      },
      {
        label: "Item tanpa standar",
        nilai: String(tanpaStandar),
        nada: tanpaStandar > 0 ? "waspada" : "baik",
      },
    ];
  }

  if (dataset === "analisa-bmw") {
    const boq = baris(data, "BOQ");
    const jadwal = baris(data, "Jadwal");
    const mutu = baris(data, "Mutu");

    const rab = boq.reduce((jumlah, row) => jumlah + angka(row.volume) * angka(row.harga_satuan), 0);
    const pagu = boq.reduce((jumlah, row) => jumlah + angka(row.pagu), 0);
    const selisih = pagu === 0 ? null : (rab - pagu) / pagu;

    const kritis = jadwal.filter((row) => row.kritis === true);
    const durasiKritis = kritis.reduce((jumlah, row) => jumlah + angka(row.durasi_hari), 0);

    return [
      { label: "Total RAB", nilai: rupiah(rab) },
      { label: "Total pagu", nilai: rupiah(pagu) },
      {
        label: "Selisih terhadap pagu",
        nilai: selisih === null ? "pagu belum diisi" : `${selisih > 0 ? "+" : ""}${persen(selisih)}`,
        nada: selisih === null ? undefined : selisih > 0.05 ? "buruk" : selisih > 0 ? "waspada" : "baik",
      },
      {
        label: "Durasi jalur kritis",
        nilai: durasiKritis === 0 ? "belum ditandai" : `${durasiKritis} hari`,
      },
      { label: "Aktivitas kritis", nilai: `${kritis.length} dari ${jadwal.length}` },
      {
        label: "Item rencana mutu",
        nilai: String(mutu.length),
        nada: mutu.length === 0 ? "waspada" : undefined,
      },
    ];
  }

  return [];
}
