import { GalatAps, tokenAps } from "@/lib/aps";

export const dynamic = "force-dynamic";

/**
 * Token untuk Autodesk Viewer di peramban.
 *
 * Client secret tidak pernah meninggalkan server; yang dikirim hanya access
 * token berumur pendek. Token ini memang berhak membaca seluruh bucket milik
 * aplikasi, jadi endpoint-nya sebaiknya diberi autentikasi begitu aplikasi ini
 * punya login — saat ini aplikasinya memang belum punya sama sekali.
 */
export async function GET() {
  try {
    const token = await tokenAps();
    return Response.json(
      { access_token: token, token_type: "Bearer", expires_in: 3600 },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GalatAps) {
      return Response.json({ error: error.message, langkah: error.langkah }, { status: 502 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
