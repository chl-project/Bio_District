import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

import { recordDocument } from "@/lib/documents";
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
      // Jaring pengaman untuk unggahan yang tidak lewat UI kita. Pencatatan utama
      // dilakukan klien via POST /api/documents; keduanya idempoten pada blob_path.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let meta: { nama?: string; projectId?: string; disiplin?: string } = {};
        if (tokenPayload) {
          try {
            meta = JSON.parse(tokenPayload);
          } catch {
            // clientPayload bukan JSON — metadata opsional, abaikan saja.
          }
        }

        await recordDocument({
          pathname: blob.pathname,
          nama: meta.nama ?? null,
          projectId: meta.projectId ?? null,
          disiplin: meta.disiplin ?? null,
        });
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
