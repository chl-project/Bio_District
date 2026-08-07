import { hitungRingkasan } from "@/lib/dataset-analisa";
import { buatHasilOlahan, type LembarTerbaca } from "@/lib/dataset-excel";
import { ambilDatasetBaris } from "@/lib/dataset-store";
import { ambilDataset, namaBerkasHasil, type Dataset } from "@/lib/datasets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mengunduh data yang tersimpan sebagai berkas Excel lengkap dengan rumusnya —
 * bukan angka hasil yang sudah mati. Kolom hitungan ditulis sebagai rumus Excel
 * yang merujuk sel isian, ditutup baris TOTAL, dan didahului lembar Ringkasan
 * yang menyebutkan cara tiap angka diperoleh.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/datasets/[dataset]/hasil">) {
  const { dataset: id } = await ctx.params;
  const dataset = ambilDataset(id);
  if (!dataset) return Response.json({ error: `Dataset "${id}" tidak dikenal.` }, { status: 404 });

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "Parameter projectId wajib." }, { status: 400 });

  try {
    const baris = await ambilDatasetBaris(projectId, id);
    if (baris.length === 0) {
      return Response.json(
        { error: "Belum ada data untuk diunduh. Unggah template yang sudah diisi lebih dulu." },
        { status: 404 },
      );
    }

    const buffer = await buatHasilOlahan(
      dataset,
      kelompokkan(dataset, baris),
      hitungRingkasan(id, baris),
    );
    const nama = namaBerkasHasil(dataset);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // filename* memakai persentase agar spasi dan huruf non-ASCII aman di semua peramban.
        "content-disposition": `attachment; filename="hasil.xlsx"; filename*=UTF-8''${encodeURIComponent(nama)}`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    console.error("[api/datasets/hasil] gagal:", pesan);
    return Response.json({ error: pesan }, { status: 500 });
  }
}

/** Baris tersimpan → satu daftar per lembar, urut sesuai urutan aslinya. */
function kelompokkan(
  dataset: Dataset,
  baris: { lembar: string; urutan: number; data: Record<string, unknown> }[],
): LembarTerbaca[] {
  return dataset.lembar.map((definisi) => ({
    lembar: definisi.nama,
    baris: baris
      .filter((item) => item.lembar === definisi.nama)
      .sort((a, b) => a.urutan - b.urutan)
      .map((item) => ({ ...item.data }) as LembarTerbaca["baris"][number]),
  }));
}
