import { runMigrations } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Membuat tabel yang dibutuhkan aplikasi (idempoten).
 * Dilindungi header `x-setup-secret` supaya endpoint DDL ini tidak terbuka publik.
 */
export async function POST(request: Request) {
  const secret = process.env.SETUP_SECRET;

  if (!secret) {
    return Response.json(
      {
        error:
          "SETUP_SECRET belum diset. Tambahkan variabel ini di Vercel (nilai bebas, acak) " +
          "lalu kirim ulang dengan header x-setup-secret.",
      },
      { status: 503 },
    );
  }

  if (request.headers.get("x-setup-secret") !== secret) {
    return Response.json({ error: "Header x-setup-secret tidak cocok." }, { status: 401 });
  }

  try {
    const jumlah = await runMigrations();
    return Response.json({ ok: true, pernyataanDijalankan: jumlah });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
