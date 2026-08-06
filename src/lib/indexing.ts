import { denganSkema, getSql } from "./db";
import { pecah } from "./chunks";
import { buatEmbedding, kemiripan, modelEmbedding } from "./embeddings";
import { bisaDiekstrak, ekstrakTeks } from "./extract";

export type StatusProses = "menunggu" | "memproses" | "siap" | "gagal" | "dilewati";

export type Rujukan = {
  dokumen: string;
  lokasi: string;
  teks: string;
  skor: number;
};

async function setStatus(id: string, status: StatusProses, pesan: string | null = null) {
  await getSql().query(`UPDATE documents SET status = $2, pesan_proses = $3 WHERE id = $1`, [
    id,
    status,
    pesan,
  ]);
}

/**
 * Mengubah satu dokumen menjadi serpihan ber-embedding agar bisa ditanyai.
 * Idempoten: serpihan lama dihapus dulu, jadi memproses ulang tidak menggandakan.
 */
export async function prosesDokumen(id: string) {
  return denganSkema(async () => {
    const sql = getSql();
    const rows = (await sql.query(
      `SELECT id, nama, blob_url, project_id FROM documents WHERE id = $1`,
      [id],
    )) as { id: string; nama: string; blob_url: string; project_id: string | null }[];

    const dokumen = rows[0];
    if (!dokumen) throw new Error("Dokumen tidak ditemukan.");

    if (!bisaDiekstrak(dokumen.nama)) {
      await setStatus(
        id,
        "dilewati",
        "Jenis berkas ini belum bisa dibaca isinya — hanya .pdf, .xlsx, dan .xls.",
      );
      return { status: "dilewati" as StatusProses, serpihan: 0 };
    }

    await setStatus(id, "memproses");

    try {
      const potongan = await ekstrakTeks(dokumen.blob_url, dokumen.nama);
      const serpihan = pecah(potongan);

      if (serpihan.length === 0) {
        await setStatus(
          id,
          "gagal",
          "Tidak ada teks yang bisa dibaca. Kemungkinan hasil pindaian — perlu OCR.",
        );
        return { status: "gagal" as StatusProses, serpihan: 0 };
      }

      const vektor = await buatEmbedding(serpihan.map((item) => item.teks));

      const model = modelEmbedding();
      await sql.query(`DELETE FROM document_chunks WHERE document_id = $1`, [id]);
      for (let i = 0; i < serpihan.length; i++) {
        await sql.query(
          `INSERT INTO document_chunks (document_id, project_id, urutan, lokasi, teks, embedding, model)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            dokumen.project_id,
            i,
            serpihan[i].lokasi,
            serpihan[i].teks,
            JSON.stringify(vektor[i]),
            model,
          ],
        );
      }

      await setStatus(id, "siap", `${serpihan.length} bagian terbaca.`);
      return { status: "siap" as StatusProses, serpihan: serpihan.length };
    } catch (error) {
      const pesan = error instanceof Error ? error.message : String(error);
      await setStatus(id, "gagal", pesan);
      throw error;
    }
  });
}

/** Batas serpihan yang dimuat per pertanyaan — pengaman memori tanpa pgvector. */
const MAKS_MUAT = 3000;

export async function cariRujukan(
  projectId: string,
  pertanyaan: string,
  ambil = 6,
): Promise<Rujukan[]> {
  return denganSkema(async () => {
    const sql = getSql();
    // Hanya serpihan dari model embedding yang sedang dipakai. Vektor lama dari
    // model lain berdimensi berbeda; membandingkannya menghasilkan peringkat
    // acak, dan itu jauh lebih buruk daripada tidak menemukan apa-apa.
    const model = modelEmbedding();
    const rows = (await sql.query(
      `SELECT c.teks, c.lokasi, c.embedding, d.nama AS dokumen
         FROM document_chunks c
         JOIN documents d ON d.id = c.document_id
        WHERE c.project_id = $1 AND (c.model = $2 OR c.model IS NULL)
        LIMIT ${MAKS_MUAT}`,
      [projectId, model],
    )) as { teks: string; lokasi: string; embedding: number[] | string; dokumen: string }[];

    if (rows.length === 0) return [];

    const [vektorTanya] = await buatEmbedding([pertanyaan]);

    return rows
      .map((row) => ({
        dokumen: row.dokumen,
        lokasi: row.lokasi,
        teks: row.teks,
        skor: kemiripan(
          vektorTanya,
          typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding,
        ),
      }))
      .sort((a, b) => b.skor - a.skor)
      .slice(0, ambil);
  });
}
