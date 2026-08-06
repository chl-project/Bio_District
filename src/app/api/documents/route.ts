import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export type DocumentRow = {
  id: string;
  project_id: string | null;
  nama: string;
  disiplin: string | null;
  tipe: string | null;
  ukuran: string | null;
  blob_url: string;
  status: string;
  created_at: string;
};

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId");

  try {
    const sql = getSql();
    const rows = (await sql.query(
      `SELECT id, project_id, nama, disiplin, tipe, ukuran, blob_url, status, created_at
         FROM documents
        WHERE ($1::text IS NULL OR project_id = $1)
        ORDER BY created_at DESC
        LIMIT 200`,
      [projectId],
    )) as DocumentRow[];

    return Response.json({ documents: rows });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
