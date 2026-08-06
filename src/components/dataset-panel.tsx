"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppContext } from "@/context/app-context";
import { hitungRingkasan } from "@/lib/dataset-analisa";
import { DATASETS } from "@/lib/datasets";
import type { BarisTersimpan } from "@/lib/dataset-store";
import { projectId } from "@/lib/projects";
import styles from "./dataset-panel.module.css";

type Props = { dataset: string };

export function DatasetPanel({ dataset }: Props) {
  const { activeProject } = useAppContext();
  const proyekId = projectId(activeProject);

  // Definisi bersifat statis dan tidak memuat rahasia, jadi diambil langsung dari
  // modul — bukan dari API. Dengan begitu unduh template dan petunjuk pengisian
  // tetap berfungsi walau basis data sedang tidak terjangkau.
  const definisi = DATASETS[dataset] ?? null;

  const [baris, setBaris] = useState<BarisTersimpan[]>([]);
  const [lembarAktif, setLembarAktif] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [analisa, setAnalisa] = useState<string | null>(null);
  const [menganalisa, setMenganalisa] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const muatKe = useRef(0);

  const muat = useCallback(async () => {
    const iniMuat = ++muatKe.current;
    try {
      const res = await fetch(
        `/api/datasets/${dataset}?projectId=${encodeURIComponent(proyekId)}`,
      );
      const data = await res.json();
      if (muatKe.current !== iniMuat) return;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setBaris(data.baris);
      setGalat(null);
    } catch (error) {
      if (muatKe.current !== iniMuat) return;
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      if (muatKe.current === iniMuat) setMemuat(false);
    }
  }, [dataset, proyekId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muat();
  }, [muat]);

  async function tanganiBerkas(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.xlsx?$/i.test(file.name)) {
      setGalat("Unggah berkas Excel (.xlsx) hasil pengisian template.");
      return;
    }

    setGalat(null);
    setSibuk("Mengunggah…");

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
        clientPayload: JSON.stringify({ nama: file.name, projectId: proyekId }),
      });

      setSibuk("Mencatat…");
      const daftarRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pathname: blob.pathname, nama: file.name, projectId: proyekId }),
      });
      const daftar = await daftarRes.json();
      if (!daftarRes.ok) throw new Error(daftar.error ?? `HTTP ${daftarRes.status}`);

      setSibuk("Membaca isi…");
      const imporRes = await fetch(`/api/datasets/${dataset}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: proyekId, documentId: daftar.document.id }),
      });
      const impor = await imporRes.json();
      if (!imporRes.ok) throw new Error(impor.error ?? `HTTP ${imporRes.status}`);

      // Diindeks juga agar isinya bisa ditanya lewat Tanya Dokumen. Kegagalan di
      // sini tidak membatalkan impor — datanya sudah tersimpan.
      void fetch(`/api/documents/${daftar.document.id}/process`, { method: "POST" });

      setAnalisa(null);
      await muat();
    } catch (error) {
      setGalat(await jelaskan(error));
    } finally {
      setSibuk(null);
    }
  }

  async function jalankanAnalisa() {
    setMenganalisa(true);
    setGalat(null);
    setAnalisa(null);
    try {
      const res = await fetch(`/api/datasets/${dataset}/analisa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: proyekId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAnalisa(data.analisa);
    } catch (error) {
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      setMenganalisa(false);
    }
  }

  const ringkasan = useMemo(() => hitungRingkasan(dataset, baris), [dataset, baris]);

  const lembar = lembarAktif ?? definisi?.lembar[0]?.nama ?? null;
  const definisiLembar = definisi?.lembar.find((item) => item.nama === lembar);
  const barisLembar = baris.filter((item) => item.lembar === lembar);

  return (
    <div className={styles.panel}>
      <div className={styles.aksi}>
        <a
          className="btn btn-secondary"
          href={`/api/datasets/${dataset}/template`}
          download
        >
          ↓ Unduh template Excel
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={tanganiBerkas}
          className={styles.hidden}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={sibuk !== null}
        >
          {sibuk ?? "+ Upload data terisi"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={jalankanAnalisa}
          disabled={menganalisa || baris.length === 0}
          title={baris.length === 0 ? "Unggah data terlebih dahulu" : undefined}
        >
          {menganalisa ? "Menganalisa…" : "✨ Analisa dengan AI"}
        </button>
        <div className={styles.spacer} />
        <span className="tag tag-outline">{activeProject}</span>
      </div>

      {galat && (
        <div className={`card elev-sm ${styles.error}`}>
          <b>Gagal memuat atau mengunggah data.</b>
          <div className={styles.errorDetail}>{galat}</div>
          <div className={styles.errorDetail}>
            Rincian per layanan ada di <a href="/status">/status</a>.
          </div>
        </div>
      )}

      {ringkasan.length > 0 && (
        <div className={styles.ringkasan}>
          {ringkasan.map((item) => (
            <div key={item.label} className={`card elev-sm ${styles.kartu}`}>
              <div className={styles.kartuLabel}>{item.label}</div>
              <div className={`${styles.kartuNilai} ${item.nada ? styles[item.nada] : ""}`}>
                {item.nilai}
              </div>
            </div>
          ))}
        </div>
      )}

      {analisa && (
        <div className="card elev-sm">
          <div className="card-kicker">Analisa AI</div>
          <div className={styles.analisa}>{analisa}</div>
        </div>
      )}

      {definisi && baris.length > 0 && (
        <div className={styles.tab}>
          {definisi.lembar.map((item) => {
            const jumlah = baris.filter((row) => row.lembar === item.nama).length;
            return (
              <button
                key={item.nama}
                type="button"
                className={`tag ${item.nama === lembar ? "tag-neutral" : "tag-outline"}`}
                onClick={() => setLembarAktif(item.nama)}
              >
                {item.nama} ({jumlah})
              </button>
            );
          })}
        </div>
      )}

      <div className={`card elev-sm ${styles.tableCard}`}>
        {definisiLembar && barisLembar.length > 0 ? (
          <div className={styles.scroll}>
            <table className="table">
              <thead>
                <tr>
                  {definisiLembar.kolom.map((kolom) => (
                    <th key={kolom.kunci}>{kolom.judul}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barisLembar.map((row) => (
                  <tr key={`${row.lembar}-${row.urutan}`}>
                    {definisiLembar.kolom.map((kolom) => (
                      <td key={kolom.kunci}>{formatSel(row.data[kolom.kunci], kolom.tipe)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.kosong}>
            {memuat
              ? "Memuat…"
              : galat
                ? "Data tidak dapat dimuat — lihat pesan di atas."
                : "Belum ada data. Unduh template, isi, lalu unggah kembali."}
          </div>
        )}
      </div>

      {definisi && baris.length === 0 && !memuat && !galat && (
        <div className="card elev-sm">
          <div className="card-title">Isi template</div>
          <p className={styles.petunjuk}>{definisi.keterangan}</p>
          <ul className={styles.daftar}>
            {definisi.lembar.map((item) => (
              <li key={item.nama}>
                <b>{item.nama}</b> — {item.keterangan}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatSel(nilai: unknown, tipe: string) {
  if (nilai === null || nilai === undefined || nilai === "") return "-";
  if (tipe === "ya-tidak") return nilai === true ? "ya" : "tidak";
  if (tipe === "angka" && typeof nilai === "number") return nilai.toLocaleString("id-ID");
  return String(nilai);
}

/** Kegagalan token Blob tampil generik; /api/health tahu layanan mana yang bermasalah. */
async function jelaskan(error: unknown) {
  const pesan = error instanceof Error ? error.message : String(error);
  if (!/client token/i.test(pesan)) return pesan;

  try {
    const res = await fetch("/api/health");
    const data: { checks?: { id: string; status: string; detail: string }[] } = await res.json();
    const blob = data.checks?.find((check) => check.id === "blob");
    if (blob && blob.status !== "ok") return `${pesan} — ${blob.detail}`;
  } catch {
    // Pesan asli lebih baik daripada tidak ada.
  }
  return pesan;
}
