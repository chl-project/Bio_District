import { overallStatus, runHealthChecks } from "@/lib/health";

// Selalu dijalankan saat request — pemeriksaan ini menyentuh jaringan.
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = await runHealthChecks();
  const status = overallStatus(checks);

  return Response.json(
    { status, checks, waktu: new Date().toISOString() },
    { status: status === "ok" ? 200 : 503 },
  );
}
