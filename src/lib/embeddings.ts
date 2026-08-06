import OpenAI from "openai";

import { requireEnv } from "./env";

export const MODEL_EMBEDDING = "text-embedding-3-small";

/**
 * Dimensi dipangkas dari 1536 ke 512. Kemiripan dihitung di JavaScript, bukan
 * pgvector, sehingga seluruh vektor satu proyek harus dimuat tiap pertanyaan —
 * memangkas dimensi menjaga biaya muat itu tetap wajar tanpa memerlukan
 * ekstensi basis data yang belum tentu tersedia.
 */
export const DIMENSI = 512;

const UKURAN_BATCH = 96;

export async function buatEmbedding(teks: string[]): Promise<number[][]> {
  if (teks.length === 0) return [];

  const client = new OpenAI({ apiKey: requireEnv("ai") });
  const hasil: number[][] = [];

  for (let i = 0; i < teks.length; i += UKURAN_BATCH) {
    const batch = teks.slice(i, i + UKURAN_BATCH);
    const res = await client.embeddings.create({
      model: MODEL_EMBEDDING,
      dimensions: DIMENSI,
      input: batch,
    });
    // Urutan balasan tidak dijamin sama dengan urutan kiriman; `index` yang menentukan.
    const urut = [...res.data].sort((a, b) => a.index - b.index);
    hasil.push(...urut.map((item) => item.embedding));
  }

  return hasil;
}

/** Embedding OpenAI sudah dinormalisasi, jadi hasil kali titik = kemiripan kosinus. */
export function kemiripan(a: number[], b: number[]) {
  let total = 0;
  const panjang = Math.min(a.length, b.length);
  for (let i = 0; i < panjang; i++) total += a[i] * b[i];
  return total;
}
