import OpenAI from "openai";

import { requireEnv } from "./env";

/**
 * Gemini menyediakan endpoint yang kompatibel dengan OpenAI, jadi satu SDK
 * cukup untuk kedua penyedia — yang berbeda hanya alamat dasar dan nama model.
 */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export type Penyedia = "openai" | "google" | "lain";

/** Kunci Google memakai awalan `AQ.` (baru) atau `AIza` (lama). */
export function kunciGoogle(kunci: string) {
  return kunci.startsWith("AQ.") || kunci.startsWith("AIza");
}

export function tebakPenyedia(kunci: string): Penyedia {
  if (kunci.startsWith("sk-")) return "openai";
  if (kunciGoogle(kunci)) return "google";
  return "lain";
}

export const NAMA_PENYEDIA: Record<Penyedia, string> = {
  openai: "OpenAI",
  google: "Google (Gemini)",
  lain: "tidak dikenali",
};

export type KonfigurasiAi = {
  kunci: string;
  baseURL?: string;
  penyedia: Penyedia;
  /** Benar bila alamatnya ditentukan sendiri lewat OPENAI_BASE_URL. */
  alamatEksplisit: boolean;
  modelChat: string;
  modelEmbedding: string;
};

/**
 * Penyedia disimpulkan dari bentuk kunci bila OPENAI_BASE_URL tidak diisi.
 * Tanpa ini, kunci Gemini yang ditaruh di OPENAI_API_KEY hanya menghasilkan
 * "401 Incorrect API key" tanpa petunjuk apa pun. Variabel lingkungan yang
 * diisi eksplisit selalu menang atas dugaan ini.
 */
export function konfigurasiAi(): KonfigurasiAi {
  const kunci = requireEnv("ai");
  const alamatEksplisit = Boolean(process.env.OPENAI_BASE_URL);
  const penyedia = tebakPenyedia(kunci);
  const google = penyedia === "google";

  return {
    kunci,
    baseURL: process.env.OPENAI_BASE_URL || (google ? GEMINI_BASE : undefined),
    penyedia,
    alamatEksplisit,
    modelChat: process.env.OPENAI_MODEL ?? (google ? "gemini-2.0-flash" : "gpt-4o-mini"),
    modelEmbedding:
      process.env.OPENAI_EMBEDDING_MODEL ?? (google ? "text-embedding-004" : "text-embedding-3-small"),
  };
}

export function klienAi(konfigurasi = konfigurasiAi()) {
  return new OpenAI({ apiKey: konfigurasi.kunci, baseURL: konfigurasi.baseURL });
}

/**
 * Dimensi hanya bisa dipangkas pada model OpenAI generasi ke-3. Penyedia lain
 * memakai dimensi bawaannya masing-masing — itu tidak masalah selama seluruh
 * serpihan di basis data berasal dari model yang sama.
 */
export const DIMENSI = 512;

export function mendukungDimensi(model: string) {
  return model.startsWith("text-embedding-3");
}
