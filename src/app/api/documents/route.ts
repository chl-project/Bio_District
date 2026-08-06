import { listDocuments, recordDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

function pesan(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId");

  try {
    return Response.json({ documents: await listDocuments(projectId) });
  } catch (error) {
    return Response.json({ error: pesan(error) }, { status: 500 });
  }
}

/**
 * Mendaftarkan berkas yang baru diunggah peramban ke Blob.
 *
 * Dipanggil klien tepat setelah `upload()` selesai. Ini jalur utama pencatatan:
 * callback `onUploadCompleted` tidak jalan di localhost dan datangnya asinkron,
 * sehingga daftar dokumen bisa terlihat kosong walau unggahan sudah sukses.
 */
export async function POST(request: Request) {
  let body: { pathname?: unknown; nama?: unknown; projectId?: unknown; disiplin?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  if (typeof body.pathname !== "string" || body.pathname.trim() === "") {
    return Response.json({ error: "Field `pathname` wajib diisi." }, { status: 400 });
  }

  try {
    const dokumen = await recordDocument({
      pathname: body.pathname,
      nama: typeof body.nama === "string" ? body.nama : null,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      disiplin: typeof body.disiplin === "string" ? body.disiplin : null,
    });

    return Response.json({ document: dokumen }, { status: 201 });
  } catch (error) {
    return Response.json({ error: pesan(error) }, { status: 500 });
  }
}
