"use client";

import { useAppContext } from "@/context/app-context";
import { Badge } from "@/components/badge";
import { DOCUMENTS } from "@/lib/sample-data";
import styles from "./page.module.css";

export default function PustakaDokumenPage() {
  const { activeProject } = useAppContext();

  return (
    <div className={styles.page}>
      <div className={styles.actionRow}>
        <button type="button" className="btn btn-primary">+ Upload dokumen</button>
        <input className={`input ${styles.search}`} placeholder="Cari dokumen…" />
        <div className={styles.spacer} />
        <span className="tag tag-outline">Semua disiplin</span>
        <span className="tag tag-outline">{activeProject}</span>
      </div>

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr><th>Nama berkas</th><th>Tipe</th><th>Disiplin</th><th>Ukuran</th><th>Tanggal</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {DOCUMENTS.map((doc) => (
              <tr key={doc.nama}>
                <td>{doc.nama}</td><td>{doc.tipe}</td><td>{doc.disiplin}</td><td>{doc.ukuran}</td><td>{doc.tanggal}</td>
                <td><Badge kind={doc.status}>{doc.statusLabel}</Badge></td>
                <td><button type="button" className={`btn btn-ghost ${styles.deleteBtn}`}>Hapus</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card elev-sm">
        <div className="card-title">Tanya Dokumen</div>
        <input
          className={`input ${styles.question}`}
          value="Berapa mutu beton yang disyaratkan untuk kolom lantai 2?"
          readOnly
        />
        <div className={styles.answer}>
          Kolom struktur lantai 2 disyaratkan mutu beton <b>K-300</b> sesuai gambar struktur
          STR-LT2-DENAH-R3, sedangkan RKS versi lama menulis K-250 — ada perbedaan yang perlu ditinjau.
          <div className={styles.sources}>
            <span className="tag tag-neutral">STR-LT2-DENAH-R3.pdf · hal. 4</span>
            <span className="tag tag-neutral">RKS Struktur Rev.2.pdf · hal. 12</span>
          </div>
        </div>
      </div>
    </div>
  );
}
