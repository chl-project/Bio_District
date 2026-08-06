import { GalatAps, mulaiTerjemahan, statusTerjemahan, tokenAps, unggahKeAps } from "@/lib/aps";
import { denganSkema, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
// Memindahkan gambar ke Autodesk lalu memulai terjemahan bisa melewati batas bawaan.
export const maxDuration = 60;

type Baris = { id: string; nama: string; blob_url: string; aps_urn: string | null };

async function ambilGambar(id: string) {
  const rows = await denganSkema(
    async () =>
      (await getSql().query(
        `SELECT id, nama, blob_url, aps_urn FROM documents WHERE id = $1`,
        [id],
      )) as Baris[],
  );
  return rows[0] ?? null;
}

function balasGalat(error: unknown) {
  if (error instanceof GalatAps) {
    console.error("[api/drawings]", error.message);
    return Response.json({ error: error.message, langkah: error.langkah }, { status: 502 });
  }
  const pesan = error instanceof Error ? error.message : String(error);
  console.error("[api/drawings]", pesan);
  return Response.json({ error: pesan }, { status: 500 });
}

/** Status terjemahan; dipanggil berkala oleh halaman selama proses berjalan. */
export async function GET(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Id tidak valid." }, { status: 400 });

  try {
    const gambar = await ambilGambar(id);
    if (!gambar) return Response.json({ error: "Gambar tidak ditemukan." }, { status: 404 });
    if (!gambar.aps_urn) return Response.json({ status: "belum-dikirim", urn: null });

    const status = await statusTerjemahan(await tokenAps(), gambar.aps_urn);
    return Response.json({ ...status, urn: gambar.aps_urn });
  } catch (error) {
    return balasGalat(error);
  }
}

/** Mengirim gambar ke Autodesk dan memulai konversi ke format yang bisa ditampilkan. */
export async function POST(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Id tidak valid." }, { status: 400 });

  try {
    const gambar = await ambilGambar(id);
    if (!gambar) return Response.json({ error: "Gambar tidak ditemukan." }, { status: 404 });

    const token = await tokenAps();
    // Nama objek diawali id agar dua berkas bernama sama tidak saling menimpa.
    const objectKey = `${gambar.id}-${gambar.nama.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { urn } = await unggahKeAps(token, objectKey, gambar.blob_url);
    await mulaiTerjemahan(token, urn);

    await denganSkema(async () =>
      getSql().query(
        `UPDATE documents SET aps_urn = $2, status = 'memproses', pesan_proses = NULL WHERE id = $1`,
        [id, urn],
      ),
    );

    return Response.json({ ok: true, urn, status: "pending" });
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    await denganSkema(async () =>
      getSql().query(`UPDATE documents SET status = 'gagal', pesan_proses = $2 WHERE id = $1`, [
        id,
        pesan,
      ]),
    ).catch(() => undefined);
    return balasGalat(error);
  }
}
