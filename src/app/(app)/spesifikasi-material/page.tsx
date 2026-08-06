import { Badge } from "@/components/badge";
import { MATERIAL_SPECS } from "@/lib/sample-data";
import styles from "./page.module.css";

export default function SpesifikasiMaterialPage() {
  return (
    <div className={styles.page}>
      <div className={styles.actionRow}>
        <button type="button" className="btn btn-secondary">Unggah RKS</button>
        <div className={styles.spacer} />
        <button type="button" className="btn btn-secondary">Ekspor Excel</button>
      </div>

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Kode</th><th>Uraian</th><th>Material</th><th>Merek/tipe</th><th>Standar</th><th>Satuan</th>
              <th className={styles.right}>Volume</th><th className={styles.right}>Harga satuan</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MATERIAL_SPECS.map((row) => (
              <tr key={row.kode}>
                <td>{row.kode}</td><td>{row.uraian}</td><td>{row.material}</td><td>{row.merek}</td>
                <td>{row.standar}</td><td>{row.satuan}</td>
                <td className={styles.right}>{row.volume}</td>
                <td className={styles.right}>Rp {row.harga}</td>
                <td><Badge kind={row.status}>{row.statusLabel}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card elev-sm" style={{ background: "var(--status-danger-bg)" }}>
        <div className={`card-title ${styles.consistencyTitle}`}>Pemeriksaan konsistensi</div>
        <div className={styles.consistencyBody}>
          <div>Mutu beton balok (STR-02): RKS menulis K-250, gambar struktur STR-LT2-DENAH-R3 menulis K-300.</div>
          <div>Diameter pipa air bersih (MEP-11) di RKS berbeda dengan sparing pada gambar struktur lantai 2.</div>
        </div>
      </div>

      <div className="card elev-sm">
        <div className="card-title">Bandingkan alternatif — STR-01 Kolom beton bertulang</div>
        <table className={`table ${styles.compareTable}`}>
          <thead><tr><th>Kriteria</th><th>Spesifikasi awal</th><th>Alternatif A</th><th>Alternatif B</th></tr></thead>
          <tbody>
            <tr><td>Material</td><td>Sesuai RKS</td><td>Setara, merek lain</td><td>Beda metode/teknologi</td></tr>
            <tr><td>Harga satuan</td><td>Basis</td><td>-4.2%</td><td>+7.8%</td></tr>
            <tr><td>Mutu / umur layan</td><td>Basis</td><td>Setara</td><td>Naik</td></tr>
            <tr><td>Ketersediaan</td><td>Basis</td><td>1 minggu</td><td>3 minggu (impor)</td></tr>
            <tr><td>Dampak waktu</td><td>Basis</td><td>+0 hari</td><td>+9 hari jalur kritis</td></tr>
          </tbody>
        </table>
        <button type="button" className={`btn btn-primary ${styles.applyBtn}`}>Terapkan Alternatif A</button>
      </div>
    </div>
  );
}
