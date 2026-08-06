import { neon } from "@neondatabase/serverless";

import { requireEnv } from "./env";
import { PROJECT_IDS } from "./projects";

type SqlClient = ReturnType<typeof neon>;

let cached: SqlClient | null = null;

/** Klien Neon (HTTP). Dibuat sekali per instance agar tidak menyambung ulang tiap request. */
export function getSql(): SqlClient {
  if (!cached) cached = neon(requireEnv("database"));
  return cached;
}

/** DDL idempoten — aman dijalankan berkali-kali. */
export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY,
    nama          TEXT NOT NULL,
    lokasi        TEXT,
    luas_lahan    TEXT,
    tipe          TEXT,
    jumlah_unit   TEXT,
    target_harga  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
    nama        TEXT NOT NULL,
    disiplin    TEXT,
    tipe        TEXT,
    ukuran      BIGINT,
    blob_url    TEXT NOT NULL,
    blob_path   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'diproses',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS documents_blob_path_key ON documents (blob_path)`,
  `CREATE INDEX IF NOT EXISTS documents_project_id_idx ON documents (project_id)`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS pesan_proses TEXT`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS aps_urn TEXT`,
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id           BIGSERIAL PRIMARY KEY,
    document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id   TEXT,
    urutan       INTEGER NOT NULL,
    lokasi       TEXT,
    teks         TEXT NOT NULL,
    embedding    JSONB NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Model embedding ikut disimpan: vektor dari model berbeda punya dimensi
  // berbeda, dan membandingkannya menghasilkan skor tanpa arti secara diam-diam.
  `ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS model TEXT`,
  `CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id)`,
  `CREATE INDEX IF NOT EXISTS document_chunks_project_id_idx ON document_chunks (project_id)`,
  `CREATE TABLE IF NOT EXISTS dataset_rows (
    id           BIGSERIAL PRIMARY KEY,
    project_id   TEXT NOT NULL,
    dataset      TEXT NOT NULL,
    lembar       TEXT NOT NULL,
    urutan       INTEGER NOT NULL,
    data         JSONB NOT NULL,
    document_id  BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS dataset_rows_lookup_idx
     ON dataset_rows (project_id, dataset, lembar, urutan)`,
];

export async function runMigrations() {
  const sql = getSql();
  for (const statement of SCHEMA_SQL) {
    await sql.query(statement);
  }

  // Dokumen memakai foreign key ke projects, jadi barisnya harus ada lebih dulu.
  for (const { id, nama } of PROJECT_IDS) {
    await sql.query(
      `INSERT INTO projects (id, nama) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, updated_at = now()`,
      [id, nama],
    );
  }

  return SCHEMA_SQL.length + PROJECT_IDS.length;
}

let migrasiBerjalan: Promise<number> | null = null;

/**
 * Hanya migrasi yang *sedang berjalan* yang dibagikan, sehingga permintaan
 * bersamaan tidak menjalankan DDL berbarengan. Hasilnya sengaja tidak disimpan:
 * menyimpan sukses membuat skema yang hilang belakangan — misalnya DATABASE_URL
 * dialihkan ke branch Neon yang masih kosong — tidak pernah dibangun ulang.
 */
function pastikanSkema() {
  migrasiBerjalan ??= runMigrations().finally(() => {
    migrasiBerjalan = null;
  });
  return migrasiBerjalan;
}

/** Kode Postgres 42P01 = undefined_table. */
function skemaBelumAda(error: unknown) {
  if ((error as { code?: string } | null)?.code === "42P01") return true;
  const pesan = error instanceof Error ? error.message : String(error);
  return /relation .* does not exist/i.test(pesan);
}

/**
 * Menjalankan operasi; bila tabelnya belum ada, skema dibuat lalu operasinya
 * diulang sekali. Dengan begitu pembuatan tabel jadi bagian dari pemakaian
 * pertama, bukan langkah manual terpisah yang mudah terlewat — dan aplikasi
 * tidak terlihat rusak hanya karena basis datanya masih kosong.
 */
export async function denganSkema<T>(operasi: () => Promise<T>): Promise<T> {
  try {
    return await operasi();
  } catch (error) {
    if (!skemaBelumAda(error)) throw error;
    await pastikanSkema();
    return operasi();
  }
}
