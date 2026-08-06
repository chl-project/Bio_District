"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { DrawingPanel } from "@/components/drawing-panel";
import { PenandaContoh } from "@/components/penanda-contoh";
import { CLASH_FINDINGS, COMPOSITE_FILES, DEFAULT_LAYERS } from "@/lib/sample-data";
import styles from "./page.module.css";

export default function KompositDrawingPage() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  const toggleLayer = (id: string) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const setOpacity = (id: string, opacity: number) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, opacity } : l)));

  return (
    <div className={styles.page}>
      <DrawingPanel />

      <PenandaContoh />

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr><th>Berkas</th><th>Disiplin</th><th>Lantai/Zona</th><th>Jenis</th><th>Rev.</th><th>Tanggal</th><th>Status</th></tr>
          </thead>
          <tbody>
            {COMPOSITE_FILES.map((f) => (
              <tr key={f.nama}>
                <td>{f.nama}</td><td>{f.disiplin}</td><td>{f.lantai}</td><td>{f.jenis}</td><td>{f.rev}</td><td>{f.tanggal}</td>
                <td><Badge kind={f.status}>{f.statusLabel}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.viewerGrid}>
        <div className={`card elev-sm ${styles.canvas}`}>
          <div className={styles.canvasHint}>
            Kanvas komposit gambar
            <br />
            (struktur · arsitektur · MEP · infrastruktur ditumpuk di sini)
          </div>
        </div>
        <div className="card elev-sm">
          <div className="card-title">Layer</div>
          {layers.map((layer) => (
            <div key={layer.id} className={styles.layerRow}>
              <div className={styles.layerTop}>
                <span className={styles.layerDot} style={{ background: layer.color }} />
                <span className={styles.layerLabel}>{layer.label}</span>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                />
              </div>
              <input
                type="range" min={0} max={100} value={layer.opacity} className={styles.layerRange}
                onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
              />
            </div>
          ))}
          <div className={styles.layerActions}>
            <button type="button" className="btn btn-secondary">Selaraskan</button>
            <button type="button" className="btn btn-secondary">Ukur jarak</button>
            <button type="button" className="btn btn-secondary">Bandingkan Rev.</button>
            <button type="button" className="btn btn-secondary">Snapshot</button>
          </div>
        </div>
      </div>

      <div className="card elev-sm">
        <div className="card-title">Temuan bentrok</div>
        {CLASH_FINDINGS.map((c, i) => (
          <div key={i} className={styles.clashRow}>
            <span className={styles.clashLoc}>{c.loc}</span>
            <span className={styles.clashDisiplin}>{c.disiplin}</span>
            <span className={styles.clashJenis}>{c.jenis}</span>
            <Badge kind={c.severityKind}>{c.severity}</Badge>
            <span className="tag tag-neutral">{c.status}</span>
            <span className={styles.clashPj}>{c.pj}</span>
          </div>
        ))}
      </div>

      <button type="button" className={`btn btn-secondary ${styles.exportBtn}`}>
        Ekspor Laporan Komposit (PDF)
      </button>
    </div>
  );
}
