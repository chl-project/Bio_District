"use client";

import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { computeIrr, computeNpv, PROJECT_INFO, SCENARIO_TABLE } from "@/lib/sample-data";
import styles from "./page.module.css";

type Tab = "legal" | "pasar" | "teknis" | "finansial";

const DATA_FIELDS: { label: string; value: string }[] = [
  { label: "Nama", value: PROJECT_INFO.nama },
  { label: "Lokasi", value: PROJECT_INFO.lokasi },
  { label: "Luas lahan", value: PROJECT_INFO.luasLahan },
  { label: "Tipe", value: PROJECT_INFO.tipe },
  { label: "Jumlah unit", value: PROJECT_INFO.jumlahUnit },
  { label: "Target harga jual", value: PROJECT_INFO.targetHarga },
  { label: "Durasi konstruksi", value: PROJECT_INFO.durasiKonstruksi },
  { label: "Laju serapan", value: PROJECT_INFO.lajuSerapan },
];

export default function StudiKelayakanPage() {
  const [tab, setTab] = useState<Tab>("legal");
  const [sens, setSens] = useState({ harga: 0, biaya: 0, serapan: 0 });

  const npv = computeNpv(sens);
  const irr = computeIrr(sens);

  return (
    <div className={styles.page}>
      <div className="card elev-sm">
        <div className="card-title">Data proyek</div>
        <div className={styles.dataGrid}>
          {DATA_FIELDS.map((f) => (
            <div key={f.label}>
              <div className={styles.dataLabel}>{f.label}</div>
              {f.value}
            </div>
          ))}
        </div>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "legal", label: "Legal & Lahan" },
          { value: "pasar", label: "Pasar" },
          { value: "teknis", label: "Teknis" },
          { value: "finansial", label: "Finansial" },
        ]}
      />

      {tab === "legal" && (
        <div className={`card elev-sm ${styles.tabCard}`}>
          <div><b>Status kepemilikan:</b> SHGB atas nama Cipta Harmoni Lestari, berlaku s.d. 2043</div>
          <div><b>Peruntukan / zonasi:</b> Zona perumahan kepadatan sedang (sesuai RDTR Kota Tangsel)</div>
          <div><b>KDB–KLB–GSB:</b> KDB 60% · KLB 1.2 · GSB jalan lingkungan 4 m</div>
          <div><b>Kelengkapan izin:</b> PKKPR terbit, PBG dalam proses, izin lingkungan (SPPL) terbit</div>
          <div><b>Catatan risiko:</b> akses jalan masuk masih menunggu persetujuan pelebaran dari dinas PU</div>
        </div>
      )}

      {tab === "pasar" && (
        <div className={`card elev-sm ${styles.tabCard}`}>
          <div><b>Segmen sasaran:</b> keluarga muda, KPR, kelas menengah</div>
          <div><b>Harga pembanding sekitar:</b> Rp 1.0–1.4 M untuk tipe sejenis dalam radius 3 km</div>
          <div><b>Perkiraan serapan:</b> 6–8 unit/bulan berdasarkan tren 12 bulan terakhir</div>
          <div><b>Ringkasan AI:</b> permintaan tipe 45/90 lebih kuat dibanding 36/72; disarankan menaikkan porsi tipe 45/90 pada tahap 2.</div>
        </div>
      )}

      {tab === "teknis" && (
        <div className={`card elev-sm ${styles.tabCard}`}>
          <div><b>Kondisi tanah &amp; topografi:</b> tanah keras pada kedalaman 3–4 m, kemiringan landai</div>
          <div><b>Utilitas:</b> PDAM tersedia di jalan utama, PLN kapasitas cukup, drainase kota perlu penyesuaian</div>
          <div><b>Aksesibilitas:</b> 400 m dari jalan kolektor, akses 2 arah</div>
          <div><b>Kesiapan desain per disiplin:</b> Struktur 90% · Arsitektur 100% · MEP 70% · Infrastruktur 60%</div>
        </div>
      )}

      {tab === "finansial" && (
        <div className={styles.finansial}>
          <div className={styles.kpiGrid}>
            <div className="card elev-sm"><div className="card-kicker">NPV</div><div className="card-title">Rp {npv} M</div></div>
            <div className="card elev-sm"><div className="card-kicker">IRR</div><div className="card-title">{irr}%</div></div>
            <div className="card elev-sm"><div className="card-kicker">BEP</div><div className="card-title">Bulan 19</div></div>
            <div className="card elev-sm"><div className="card-kicker">Payback</div><div className="card-title">4.3 th</div></div>
            <div className="card elev-sm"><div className="card-kicker">Profitability Index</div><div className="card-title">1.31</div></div>
          </div>

          <div className="card elev-sm">
            <div className="card-title">Analisa sensitivitas</div>
            <div className={styles.sensList}>
              <div>
                <div className={styles.sensLabelRow}><span>Harga jual</span><span>{sens.harga}%</span></div>
                <input
                  type="range" min={-20} max={20} value={sens.harga} className={styles.range}
                  onChange={(e) => setSens((s) => ({ ...s, harga: Number(e.target.value) }))}
                />
              </div>
              <div>
                <div className={styles.sensLabelRow}><span>Biaya konstruksi</span><span>{sens.biaya}%</span></div>
                <input
                  type="range" min={-20} max={20} value={sens.biaya} className={styles.range}
                  onChange={(e) => setSens((s) => ({ ...s, biaya: Number(e.target.value) }))}
                />
              </div>
              <div>
                <div className={styles.sensLabelRow}><span>Laju serapan</span><span>{sens.serapan}%</span></div>
                <input
                  type="range" min={-20} max={20} value={sens.serapan} className={styles.range}
                  onChange={(e) => setSens((s) => ({ ...s, serapan: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="card elev-sm">
            <div className="card-title">Skenario</div>
            <table className="table" style={{ marginTop: 6 }}>
              <thead><tr><th>Skenario</th><th>NPV</th><th>IRR</th><th>Payback</th></tr></thead>
              <tbody>
                {SCENARIO_TABLE.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td><td>Rp {row.npv} M</td><td>{row.irr}</td><td>{row.payback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card elev-sm" style={{ background: "var(--status-warning-bg)" }}>
            <div className={`card-title ${styles.summaryTitle}`}>Ringkasan eksekutif (AI)</div>
            <p className={`card-body ${styles.summaryBody}`}>
              Proyek <b>layak bersyarat</b>. IRR 19.2% berada di atas ambang batas 15%, namun sensitif terhadap
              kenaikan biaya konstruksi di atas 8% dan pelambatan serapan di bawah 5 unit/bulan. Disarankan
              mengunci harga material struktur &amp; MEP lebih awal dan mempercepat pemasaran tipe 45/90.
            </p>
          </div>

          <div className={styles.exportRow}>
            <button type="button" className="btn btn-secondary">Ekspor PDF ringkasan</button>
            <button type="button" className="btn btn-secondary">Ekspor Excel angka</button>
          </div>
        </div>
      )}
    </div>
  );
}
