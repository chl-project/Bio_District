import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

import { getSql } from "@/lib/db";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

const MAX_UKURAN_BYTE = 50 * 1024 * 1024;

/**
 * Menerbitkan token unggah langsung ke Blob dari peramban, lalu mencatat metadata
 * ke Neon saat unggahan selesai. Jalur ini dipakai (bukan `put()` di server) karena
 * body Route Handler di Vercel dibatasi 4.5 MB — gambar & RKS umumnya lebih besar.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const hasil = await handleUpload({
      body,
      request,
      token: requireEnv("blob"),
      onBeforeGenerateToken: async (_pathname, clientPayload) => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_UKURAN_BYTE,
        addRandomSuffix: true,
        tokenPayload: clientPayload,
      }),
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let meta: { projectId?: string; disiplin?: string } = {};
        if (tokenPayload) {
          try {
            meta = JSON.parse(tokenPayload);
          } catch {
            // clientPayload bukan JSON — metadata opsional, abaikan saja.
          }
        }

        const sql = getSql();
        await sql.query(
          `INSERT INTO documents (project_id, nama, disiplin, tipe, ukuran, blob_url, blob_path, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'diproses')
           ON CONFLICT (blob_path) DO NOTHING`,
          [
            meta.projectId ?? null,
            blob.pathname.split("/").pop() ?? blob.pathname,
            meta.disiplin ?? null,
            blob.contentType ?? null,
            null,
            blob.url,
            blob.pathname,
          ],
        );
      },
    });

    return Response.json(hasil);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
