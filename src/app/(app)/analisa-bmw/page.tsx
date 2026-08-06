"use client";

import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { BMW_SCENARIOS, BOQ_DIVISIONS, ITP_LIST, WAKTU_ACTIVITIES, type BmwScenarioKey } from "@/lib/sample-data";
import styles from "./page.module.css";

type Tab = "biaya" | "mutu" | "waktu";

export default function AnalisaBmwPage() {
  const [tab, setTab] = useState<Tab>("biaya");
  const [scenarioKey, setScenarioKey] = useState<BmwScenarioKey>("seimbang");
  const scenario = BMW_SCENARIOS[scenarioKey];

  return (
    <div className={styles.page}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "biaya", label: "Biaya" },
          { value: "mutu", label: "Mutu" },
          { value: "waktu", label: "Waktu" },
        ]}
      />

      {tab === "biaya" && (
        <div className="card elev-sm">
          <div className="card-title">Rekapitulasi per divisi pekerjaan</div>
          <table className={`table ${styles.tabTable}`}>
            <thead><tr><th>Divisi</th><th style={{ textAlign: "right" }}>RAB</th><th style={{ textAlign: "right" }}>Pagu anggaran</th><th style={{ textAlign: "right" }}>Selisih</th></tr></thead>
            <tbody>
              {BOQ_DIVISIONS.map((d) => (
                <tr key={d.divisi}>
                  <td>{d.divisi}</td>
                  <td style={{ textAlign: "right" }}>Rp {d.rab}</td>
                  <td style={{ textAlign: "right" }}>Rp {d.pagu}</td>
                  <td style={{ textAlign: "right", color: d.selisih.startsWith("+") ? "var(--status-danger-text)" : "var(--status-success-text)" }}>
                    {d.selisih}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.note}>Grafik Pareto: struktur &amp; arsitektur menyerap 72% dari total RAB.</div>
        </div>
      )}

      {tab === "mutu" && (
        <div className="card elev-sm">
          <div className="card-title">Rencana pemeriksaan &amp; pengujian (ITP)</div>
          <table className={`table ${styles.tabTable}`}>
            <thead><tr><th>Item pekerjaan</th><th>Jenis uji</th><th>Frekuensi</th><th>Kriteria terima</th><th>PJ</th></tr></thead>
            <tbody>
              {ITP_LIST.map((i) => (
                <tr key={i.item}>
                  <td>{i.item}</td><td>{i.uji}</td><td>{i.frekuensi}</td><td>{i.kriteria}</td><td>{i.pj}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "waktu" && (
        <div className="card elev-sm">
          <div className="card-title">Jadwal pelaksanaan</div>
          <table className={`table ${styles.tabTable}`}>
            <thead><tr><th>Aktivitas</th><th>Durasi</th><th>Mulai</th><th>Selesai</th><th>Jalur kritis</th></tr></thead>
            <tbody>
              {WAKTU_ACTIVITIES.map((w) => (
                <tr key={w.aktivitas}>
                  <td>{w.aktivitas}</td><td>{w.durasi}</td><td>{w.mulai}</td><td>{w.selesai}</td><td>{w.kritis ? "Ya" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.note}>Kurva S: realisasi 2% di belakang rencana pada minggu ke-14.</div>
        </div>
      )}

      <div className="card elev-sm">
        <div className="card-title">Panel Keseimbangan (trade-off)</div>
        <div className={styles.tradeoffSeg}>
          <Segmented
            value={scenarioKey}
            onChange={setScenarioKey}
            options={[
              { value: "hemat", label: "Hemat Biaya" },
              { value: "seimbang", label: "Seimbang" },
              { value: "cepat", label: "Cepat Selesai" },
            ]}
          />
        </div>
        <div className={styles.tradeoffGrid}>
          <div className={`card ${styles.tradeoffCard}`}><div className="card-kicker">Total biaya</div><div className="card-title">{scenario.biaya}</div></div>
          <div className={`card ${styles.tradeoffCard}`}><div className="card-kicker">Tingkat mutu</div><div className="card-title">{scenario.mutu}</div></div>
          <div className={`card ${styles.tradeoffCard}`}><div className="card-kicker">Durasi</div><div className="card-title">{scenario.waktu}</div></div>
        </div>
        <p className={styles.recommendation}>{scenario.rekomendasi}</p>
        <div className={styles.exportRow}>
          <button type="button" className="btn btn-secondary">Ekspor PDF laporan</button>
          <button type="button" className="btn btn-secondary">Ekspor Excel BOQ &amp; jadwal</button>
        </div>
      </div>
    </div>
  );
}
