import { del, head } from "@vercel/blob";

import { denganSkema, getSql } from "./db";
import { requireEnv } from "./env";

export type DocumentRow = {
  id: string;
  project_id: string | null;
  nama: string;
  disiplin: string | null;
  tipe: string | null;
  ukuran: string | null;
  blob_url: string;
  blob_path: string;
  status: string;
  created_at: string;
};

const SELECT_COLUMNS = `id, project_id, nama, disiplin, tipe, ukuran,
                        blob_url, blob_path, status, created_at`;

/**
 * Mencatat berkas yang sudah ada di Blob ke Neon.
 *
 * Ukuran, tipe, dan URL diambil dari `head()` — bukan dari klien — supaya
 * peramban tidak bisa mendaftarkan berkas yang tidak benar-benar terunggah,
 * atau mengarang metadata. `nama` dan `disiplin` hanya label tampilan.
 */
export async function recordDocument(input: {
  pathname: string;
  nama?: string | null;
  projectId?: string | null;
  disiplin?: string | null;
}) {
  const meta = await head(input.pathname, { token: requireEnv("blob") });

  const rows = await denganSkema(
    async () =>
      (await getSql().query(
        `INSERT INTO documents (project_id, nama, disiplin, tipe, ukuran, blob_url, blob_path, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'diproses')
         ON CONFLICT (blob_path)
           DO UPDATE SET nama     = EXCLUDED.nama,
                         disiplin = COALESCE(EXCLUDED.disiplin, documents.disiplin),
                         ukuran   = EXCLUDED.ukuran
         RETURNING ${SELECT_COLUMNS}`,
        [
          input.projectId ?? null,
          input.nama?.trim() || namaDariPath(meta.pathname),
          input.disiplin ?? null,
          meta.contentType ?? null,
          meta.size,
          meta.url,
          meta.pathname,
        ],
      )) as DocumentRow[],
  );

  return rows[0];
}

export async function listDocuments(projectId: string | null) {
  return denganSkema(
    async () =>
      (await getSql().query(
        `SELECT ${SELECT_COLUMNS}
           FROM documents
          WHERE ($1::text IS NULL OR project_id = $1)
          ORDER BY created_at DESC
          LIMIT 200`,
        [projectId],
      )) as DocumentRow[],
  );
}

/** Menghapus baris beserta berkasnya di Blob. Mengembalikan false bila id tidak ada. */
export async function deleteDocument(id: string) {
  const rows = await denganSkema(
    async () =>
      (await getSql().query(`DELETE FROM documents WHERE id = $1 RETURNING blob_path`, [
        id,
      ])) as { blob_path: string }[],
  );

  if (rows.length === 0) return false;

  // Baris sudah hilang; kalau penghapusan blob gagal, biarkan gagal diam-diam
  // supaya berkas yatim tidak memblokir penghapusan dari sisi pengguna.
  try {
    await del(rows[0].blob_path, { token: requireEnv("blob") });
  } catch {
    // sengaja diabaikan
  }

  return true;
}

function namaDariPath(pathname: string) {
  return pathname.split("/").pop() ?? pathname;
}
