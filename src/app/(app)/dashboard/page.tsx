"use client";

import Link from "next/link";
import { useAppContext } from "@/context/app-context";
import { Badge } from "@/components/badge";
import { ACTIVITIES, BASE_IRR, BASE_NPV } from "@/lib/sample-data";
import styles from "./page.module.css";

const MENU_CARDS = [
  { title: "Studi Kelayakan", body: "Analisa legal, pasar, teknis, dan finansial proyek.", href: "/studi-kelayakan" },
  { title: "Spesifikasi Material", body: "Pembedahan RKS & perbandingan alternatif material.", href: "/spesifikasi-material" },
  { title: "Komposit Drawing", body: "Tumpuk & periksa gambar antar-disiplin.", href: "/komposit-drawing" },
  { title: "Analisa BMW", body: "BOQ/RAB, rencana mutu, jadwal, dan trade-off.", href: "/analisa-bmw" },
  { title: "Pustaka Dokumen", body: "Repositori dokumen & tanya-jawab AI.", href: "/pustaka-dokumen" },
];

export default function DashboardPage() {
  const { activeProject } = useAppContext();

  return (
    <div className={styles.page}>
      <div>
        <h2>Halo, Aditya 👋</h2>
        <div className={styles.subheading}>Kamis, 6 Agustus 2026 · Proyek aktif: {activeProject}</div>
      </div>

      <div className={styles.kpiGrid}>
        <div className="card elev-sm">
          <div className="card-kicker">Status Kelayakan</div>
          <div className={styles.statusTag}>
            <Badge kind="warning">Layak Bersyarat</Badge>
          </div>
        </div>
        <div className="card elev-sm">
          <div className="card-kicker">NPV</div>
          <div className="card-title">Rp {BASE_NPV.toFixed(1)} M</div>
        </div>
        <div className="card elev-sm">
          <div className="card-kicker">IRR</div>
          <div className="card-title">{BASE_IRR.toFixed(1)}%</div>
        </div>
        <div className="card elev-sm">
          <div className="card-kicker">Payback Period</div>
          <div className="card-title">4.3 th</div>
        </div>
        <div className="card elev-sm">
          <div className="card-kicker">Total RAB</div>
          <div className="card-title">Rp 142.6 M</div>
        </div>
      </div>

      <div className={`card elev-sm ${styles.dangerBanner}`}>
        <div className={styles.dangerLeft}>
          <span className={styles.dangerCount}>7</span>
          <span className={styles.dangerText}>temuan bentrok gambar masih terbuka — lihat di Komposit Drawing</span>
        </div>
        <Link href="/komposit-drawing" className="btn btn-secondary" style={{ fontSize: 13 }}>
          Buka
        </Link>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Menu</h4>
        <div className={styles.menuGrid}>
          {MENU_CARDS.map((m) => (
            <div key={m.href} className={`card elev-sm ${styles.menuCard}`}>
              <div className="card-title">{m.title}</div>
              <p className="card-body">{m.body}</p>
              <Link href={m.href} className="btn btn-primary btn-block">
                Buka
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className="card elev-sm">
          <div className="card-title">Aktivitas terakhir</div>
          {ACTIVITIES.map((a, i) => (
            <div key={i} className={styles.activityRow}>
              <span>{a.text}</span>
              <span className={styles.activityTime}>{a.time}</span>
            </div>
          ))}
        </div>
        <div className={`card elev-sm ${styles.newProjectCard}`}>
          <div className="card-title">Proyek Baru</div>
          <p className="card-body">Mulai studi kelayakan untuk proyek lain.</p>
          <button type="button" className="btn btn-primary">
            + Proyek Baru
          </button>
        </div>
      </div>
    </div>
  );
}
