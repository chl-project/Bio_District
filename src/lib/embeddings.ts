import { DIMENSI, klienAi, konfigurasiAi, mendukungDimensi } from "./ai-client";

export { DIMENSI };

const UKURAN_BATCH = 96;

export function modelEmbedding() {
  return konfigurasiAi().modelEmbedding;
}

export async function buatEmbedding(teks: string[]): Promise<number[][]> {
  if (teks.length === 0) return [];

  const konfigurasi = konfigurasiAi();
  const client = klienAi(konfigurasi);
  const hasil: number[][] = [];

  for (let i = 0; i < teks.length; i += UKURAN_BATCH) {
    const batch = teks.slice(i, i + UKURAN_BATCH);
    const res = await client.embeddings.create({
      model: konfigurasi.modelEmbedding,
      ...(mendukungDimensi(konfigurasi.modelEmbedding) ? { dimensions: DIMENSI } : {}),
      input: batch,
    });
    // Urutan balasan tidak dijamin sama dengan urutan kiriman; `index` yang menentukan.
    const urut = [...res.data].sort((a, b) => a.index - b.index);
    hasil.push(...urut.map((item) => item.embedding));
  }

  return hasil;
}

/**
 * Kosinus dengan normalisasi eksplisit. Embedding OpenAI sudah bernorma satu,
 * tetapi penyedia lain belum tentu — tanpa normalisasi, skornya tidak sebanding.
 */
export function kemiripan(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;

  let titik = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    titik += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const pembagi = Math.sqrt(normA) * Math.sqrt(normB);
  return pembagi === 0 ? 0 : titik / pembagi;
}
