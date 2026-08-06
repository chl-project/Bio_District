import { bacaUnggahan } from "@/lib/dataset-excel";
import { ambilDatasetBaris, simpanDataset } from "@/lib/dataset-store";
import { ambilDataset } from "@/lib/datasets";
import { getSql, denganSkema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function pesan(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request, ctx: RouteContext<"/api/datasets/[dataset]">) {
  const { dataset: id } = await ctx.params;
  const dataset = ambilDataset(id);
  if (!dataset) return Response.json({ error: `Dataset "${id}" tidak dikenal.` }, { status: 404 });

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "Parameter projectId wajib." }, { status: 400 });

  try {
    return Response.json({ definisi: dataset, baris: await ambilDatasetBaris(projectId, id) });
  } catch (error) {
    return Response.json({ error: pesan(error) }, { status: 500 });
  }
}

/** Membaca berkas template yang sudah diunggah ke Blob, lalu menyimpannya sebagai baris data. */
export async function POST(request: Request, ctx: RouteContext<"/api/datasets/[dataset]">) {
  const { dataset: id } = await ctx.params;
  const dataset = ambilDataset(id);
  if (!dataset) return Response.json({ error: `Dataset "${id}" tidak dikenal.` }, { status: 404 });

  let body: { projectId?: unknown; documentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  if (typeof body.projectId !== "string" || body.projectId === "") {
    return Response.json({ error: "Field `projectId` wajib diisi." }, { status: 400 });
  }
  if (typeof body.documentId !== "string" || !/^\d+$/.test(body.documentId)) {
    return Response.json({ error: "Field `documentId` wajib diisi." }, { status: 400 });
  }

  const projectId = body.projectId;
  const documentId = body.documentId;

  try {
    // URL diambil dari basis data, bukan dari klien, supaya berkas yang dibaca
    // dipastikan yang benar-benar tercatat untuk proyek ini.
    const rows = await denganSkema(
      async () =>
        (await getSql().query(`SELECT blob_url, nama FROM documents WHERE id = $1`, [
          documentId,
        ])) as { blob_url: string; nama: string }[],
    );

    const dokumen = rows[0];
    if (!dokumen) return Response.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

    const res = await fetch(dokumen.blob_url);
    if (!res.ok) {
      return Response.json(
        { error: `Berkas tidak terbaca dari Blob (HTTP ${res.status}).` },
        { status: 502 },
      );
    }

    const lembar = await bacaUnggahan(dataset, await res.arrayBuffer());
    const jumlah = await simpanDataset(projectId, id, lembar, documentId);

    return Response.json({
      ok: true,
      jumlahBaris: jumlah,
      perLembar: lembar.map((item) => ({ lembar: item.lembar, baris: item.baris.length })),
    });
  } catch (error) {
    console.error("[api/datasets] impor gagal:", pesan(error));
    return Response.json({ error: pesan(error) }, { status: 400 });
  }
}
