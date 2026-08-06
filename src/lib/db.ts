import { neon } from "@neondatabase/serverless";

import { requireEnv } from "./env";

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
];

export async function runMigrations() {
  const sql = getSql();
  for (const statement of SCHEMA_SQL) {
    await sql.query(statement);
  }
  return SCHEMA_SQL.length;
}
