import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

import { recordDocument } from "@/lib/documents";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Penjagaan utama memakai ekstensi, bukan tipe konten: peramban melaporkan
 * `application/octet-stream` untuk .xlsx/.docx bila Office tidak terpasang,
 * sehingga berkas yang sah ikut ditolak kalau MIME yang dijadikan patokan.
 */
const EKSTENSI_DIIZINKAN = ["pdf", "xlsx", "xls", "docx", "doc", "png", "jpg", "jpeg"];

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "application/octet-stream",
];

const MAX_UKURAN_BYTE = 50 * 1024 * 1024;

function ekstensiDari(pathname: string) {
  const nama = pathname.split("/").pop() ?? pathname;
  const titik = nama.lastIndexOf(".");
  return titik === -1 ? "" : nama.slice(titik + 1).toLowerCase();
}

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
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const ekstensi = ekstensiDari(pathname);
        if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
          throw new Error(
            `Jenis berkas ".${ekstensi}" tidak didukung. Yang diterima: ` +
              EKSTENSI_DIIZINKAN.map((item) => `.${item}`).join(", "),
          );
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UKURAN_BYTE,
          addRandomSuffix: true,
          tokenPayload: clientPayload,
        };
      },
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
    const pesan = error instanceof Error ? error.message : String(error);
    // SDK Blob membuang body respons ini dan hanya menampilkan "Failed to
    // retrieve the client token" ke pengguna, jadi log server adalah satu-satunya
    // tempat alasan aslinya terbaca.
    console.error("[api/documents/upload] gagal menerbitkan token:", pesan);
    return Response.json({ error: pesan }, { status: 500 });
  }
}
