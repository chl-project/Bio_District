import { denganSkema, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

const DIIZINKAN = ["menunggu", "memproses", "siap", "gagal", "dilewati"];

/**
 * Menyimpan hasil pemantauan konversi dari halaman. Nilai statusnya dibatasi
 * daftar tetap agar peramban tidak bisa menulis nilai sembarang ke kolom ini.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/status">) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Id tidak valid." }, { status: 400 });

  let body: { status?: unknown; pesan?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  if (typeof body.status !== "string" || !DIIZINKAN.includes(body.status)) {
    return Response.json(
      { error: `Status harus salah satu dari: ${DIIZINKAN.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    await denganSkema(async () =>
      getSql().query(`UPDATE documents SET status = $2, pesan_proses = $3 WHERE id = $1`, [
        id,
        body.status,
        typeof body.pesan === "string" ? body.pesan : null,
      ]),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
