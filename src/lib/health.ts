import { list } from "@vercel/blob";
import OpenAI from "openai";

import { getSql } from "./db";
import {
  ENV_KEYS,
  OPENAI_MODEL,
  getBlobToken,
  getDatabaseUrl,
  getOpenAiKey,
  namaMirip,
} from "./env";

export type ServiceId = "database" | "blob" | "ai";

export type ServiceStatus = "ok" | "belum-diset" | "gagal";

export type ServiceCheck = {
  id: ServiceId;
  label: string;
  status: ServiceStatus;
  /** Nama variabel lingkungan yang terbaca, atau daftar kandidat bila belum ada. */
  envVar: string;
  detail: string;
  durasiMs: number;
};

function missing(id: ServiceId, label: string): ServiceCheck {
  // Menyebut variabel mirip yang memang ada sangat mempercepat diagnosa: kalau
  // integrasi dipasang dengan awalan khusus, namanya akan muncul di sini.
  // Hanya nama yang ditampilkan — nilainya rahasia.
  const mirip = namaMirip(id);
  const petunjuk =
    mirip.length > 0
      ? ` Yang terdeteksi di runtime: ${mirip.join(", ")} — pastikan salah satunya berisi kredensial yang benar.`
      : " Tidak ada variabel bernama mirip di runtime ini, jadi store-nya kemungkinan belum tersambung ke proyek.";

  return {
    id,
    label,
    status: "belum-diset",
    envVar: ENV_KEYS[id].join(" / "),
    detail:
      `Variabel lingkungan belum terbaca di runtime ini. ` +
      `Set salah satu dari: ${ENV_KEYS[id].join(", ")}.${petunjuk}`,
    durasiMs: 0,
  };
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** Batas tunggu tiap pemeriksaan. Tanpa ini, host yang tidak terjangkau membuat
 *  endpoint menggantung sampai fungsi Vercel time out — tanpa keterangan apa pun. */
const TIMEOUT_MS = 8_000;

async function timed<T>(fn: () => Promise<T>) {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const batasWaktu = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`tidak ada respons dalam ${TIMEOUT_MS / 1000} detik`)),
      TIMEOUT_MS,
    );
  });

  try {
    const value = await Promise.race([fn(), batasWaktu]);
    return { value, durasiMs: Date.now() - start, error: null as unknown };
  } catch (error) {
    return { value: null, durasiMs: Date.now() - start, error };
  } finally {
    clearTimeout(timer);
  }
}

async function checkDatabase(): Promise<ServiceCheck> {
  const env = getDatabaseUrl();
  if (!env) return missing("database", "Neon Postgres");

  const { value, durasiMs, error } = await timed(async () => {
    const sql = getSql();
    const rows = (await sql.query(
      `SELECT current_database() AS db,
              (SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public') AS tabel`,
    )) as { db: string; tabel: string }[];
    return rows[0];
  });

  if (error) {
    return {
      id: "database",
      label: "Neon Postgres",
      status: "gagal",
      envVar: env.key,
      detail: `Tersambung gagal: ${describe(error)}`,
      durasiMs,
    };
  }

  return {
    id: "database",
    label: "Neon Postgres",
    status: "ok",
    envVar: env.key,
    detail: `Tersambung ke basis data "${value?.db}" — ${value?.tabel ?? 0} tabel di skema public.`,
    durasiMs,
  };
}

async function checkBlob(): Promise<ServiceCheck> {
  const env = getBlobToken();
  if (!env) return missing("blob", "Vercel Blob");

  const { value, durasiMs, error } = await timed(() => list({ limit: 1, token: env.value }));

  if (error) {
    return {
      id: "blob",
      label: "Vercel Blob",
      status: "gagal",
      envVar: env.key,
      detail: `Token ditolak atau store tidak terjangkau: ${describe(error)}`,
      durasiMs,
    };
  }

  const jumlah = value?.blobs.length ?? 0;
  return {
    id: "blob",
    label: "Vercel Blob",
    status: "ok",
    envVar: env.key,
    detail:
      jumlah > 0
        ? "Store terbaca dan sudah berisi berkas."
        : "Store terbaca, masih kosong (normal untuk store baru).",
    durasiMs,
  };
}

async function checkAi(): Promise<ServiceCheck> {
  const env = getOpenAiKey();
  if (!env) return missing("ai", "OpenAI API");

  const { value, durasiMs, error } = await timed(async () => {
    const client = new OpenAI({ apiKey: env.value });
    const models = await client.models.list();
    return models.data.map((model) => model.id);
  });

  if (error) {
    return {
      id: "ai",
      label: "OpenAI API",
      status: "gagal",
      envVar: env.key,
      detail: `Kunci API ditolak: ${describe(error)}`,
      durasiMs,
    };
  }

  const punyaModel = value?.includes(OPENAI_MODEL) ?? false;
  return {
    id: "ai",
    label: "OpenAI API",
    status: "ok",
    envVar: env.key,
    detail: punyaModel
      ? `Kunci valid, model "${OPENAI_MODEL}" tersedia.`
      : `Kunci valid, tetapi model "${OPENAI_MODEL}" tidak ada di daftar akun ini — sesuaikan OPENAI_MODEL.`,
    durasiMs,
  };
}

export async function runHealthChecks(): Promise<ServiceCheck[]> {
  return Promise.all([checkDatabase(), checkBlob(), checkAi()]);
}

export function overallStatus(checks: ServiceCheck[]): ServiceStatus {
  if (checks.some((check) => check.status === "gagal")) return "gagal";
  if (checks.some((check) => check.status === "belum-diset")) return "belum-diset";
  return "ok";
}
