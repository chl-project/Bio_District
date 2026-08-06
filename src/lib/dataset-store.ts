import { denganSkema, getSql } from "./db";
import type { BarisTerbaca, LembarTerbaca } from "./dataset-excel";

export type BarisTersimpan = { lembar: string; urutan: number; data: BarisTerbaca };

/**
 * Mengganti seluruh isi dataset untuk satu proyek dengan hasil unggahan terbaru.
 * Unggah ulang berarti "ini versi terbaru", bukan "tambahkan lagi" — kalau
 * ditambahkan, salah unggah sekali akan menggandakan BOQ tanpa terlihat.
 */
export async function simpanDataset(
  projectId: string,
  dataset: string,
  lembar: LembarTerbaca[],
  documentId: string | null,
) {
  return denganSkema(async () => {
    const sql = getSql();
    await sql.query(`DELETE FROM dataset_rows WHERE project_id = $1 AND dataset = $2`, [
      projectId,
      dataset,
    ]);

    let jumlah = 0;
    for (const { lembar: nama, baris } of lembar) {
      for (let i = 0; i < baris.length; i++) {
        await sql.query(
          `INSERT INTO dataset_rows (project_id, dataset, lembar, urutan, data, document_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, dataset, nama, i, JSON.stringify(baris[i]), documentId],
        );
        jumlah++;
      }
    }

    return jumlah;
  });
}

export async function ambilDatasetBaris(
  projectId: string,
  dataset: string,
): Promise<BarisTersimpan[]> {
  return denganSkema(async () => {
    const rows = (await getSql().query(
      `SELECT lembar, urutan, data
         FROM dataset_rows
        WHERE project_id = $1 AND dataset = $2
        ORDER BY lembar, urutan`,
      [projectId, dataset],
    )) as { lembar: string; urutan: number; data: BarisTerbaca | string }[];

    return rows.map((row) => ({
      lembar: row.lembar,
      urutan: row.urutan,
      data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    }));
  });
}
