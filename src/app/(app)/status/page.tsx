import { Badge } from "@/components/badge";
import { overallStatus, runHealthChecks, type ServiceStatus } from "@/lib/health";
import type { StatusKind } from "@/lib/sample-data";
import styles from "./page.module.css";

// Halaman diagnostik: selalu diperiksa ulang saat dibuka.
export const dynamic = "force-dynamic";

export const metadata = { title: "Status Integrasi · Harmoni Feasibility Studio" };

const KIND: Record<ServiceStatus, StatusKind> = {
  ok: "success",
  "belum-diset": "warning",
  gagal: "danger",
};

const LABEL: Record<ServiceStatus, string> = {
  ok: "Terhubung ✓",
  "belum-diset": "Belum diset",
  gagal: "Gagal",
};

const RINGKASAN: Record<ServiceStatus, string> = {
  ok: "Semua layanan tersambung. Aplikasi siap dipakai.",
  "belum-diset":
    "Sebagian variabel lingkungan belum terbaca. Tambahkan di Vercel → Settings → " +
    "Environment Variables, lalu Redeploy (variabel baru tidak berlaku pada deployment lama).",
  gagal:
    "Ada layanan yang menolak koneksi. Periksa detail di bawah — biasanya kredensial salah " +
    "environment (Preview vs Production) atau store sudah dihapus.",
};

export default async function StatusPage() {
  const checks = await runHealthChecks();
  const status = overallStatus(checks);

  return (
    <div className={styles.page}>
      <div className="card elev-sm">
        <div className="card-kicker">Diagnostik</div>
        <div className="card-title">Status integrasi</div>
        <p className="card-body">{RINGKASAN[status]}</p>
      </div>

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Layanan</th>
              <th>Variabel</th>
              <th>Status</th>
              <th>Waktu</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.id}>
                <td>{check.label}</td>
                <td className={styles.mono}>{check.envVar}</td>
                <td>
                  <Badge kind={KIND[check.status]}>{LABEL[check.status]}</Badge>
                </td>
                <td>{check.durasiMs} ms</td>
                <td className={styles.detail}>{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card elev-sm">
        <div className="card-title">Langkah setelah semua hijau</div>
        <ol className={styles.steps}>
          <li>
            Set <span className={styles.mono}>SETUP_SECRET</span> di Vercel (nilai acak bebas),
            lalu Redeploy.
          </li>
          <li>
            Jalankan pembuatan tabel sekali:
            <pre className={styles.pre}>
{`curl -X POST https://<domain-anda>/api/setup \\
  -H "x-setup-secret: <nilai SETUP_SECRET>"`}
            </pre>
          </li>
          <li>
            Verifikasi lewat <span className={styles.mono}>/api/health</span> — jumlah tabel di
            skema public harus bertambah.
          </li>
        </ol>
      </div>
    </div>
  );
}
