import type { Potongan } from "./extract";

export type Serpihan = { lokasi: string; teks: string };

const MAKS_KARAKTER = 1200;
const TUMPANG_TINDIH = 200;

/** Batas atas per dokumen supaya satu berkas raksasa tidak menghabiskan kuota embedding. */
export const MAKS_SERPIHAN = 300;

/**
 * Memecah teks per halaman/sheet menjadi serpihan yang muat di jendela embedding.
 * Pemotongan diusahakan di batas paragraf lalu kalimat, supaya kalimat tidak
 * terputus di tengah dan konteksnya tetap terbaca saat dijadikan rujukan.
 */
export function pecah(potongan: Potongan[]): Serpihan[] {
  const hasil: Serpihan[] = [];

  for (const { lokasi, teks } of potongan) {
    for (const bagian of pecahTeks(teks)) {
      hasil.push({ lokasi, teks: bagian });
      if (hasil.length >= MAKS_SERPIHAN) return hasil;
    }
  }

  return hasil;
}

function pecahTeks(teks: string): string[] {
  if (teks.length <= MAKS_KARAKTER) return [teks];

  const hasil: string[] = [];
  let mulai = 0;

  while (mulai < teks.length) {
    let akhir = Math.min(mulai + MAKS_KARAKTER, teks.length);

    if (akhir < teks.length) {
      const jendela = teks.slice(mulai, akhir);
      const batas = Math.max(
        jendela.lastIndexOf("\n\n"),
        jendela.lastIndexOf(". "),
        jendela.lastIndexOf("\n"),
      );
      // Hanya dipakai bila batasnya tidak terlalu awal — kalau tidak, serpihannya jadi kerdil.
      if (batas > MAKS_KARAKTER * 0.5) akhir = mulai + batas + 1;
    }

    const bagian = teks.slice(mulai, akhir).trim();
    if (bagian) hasil.push(bagian);

    if (akhir >= teks.length) break;
    mulai = Math.max(akhir - TUMPANG_TINDIH, mulai + 1);
  }

  return hasil;
}
