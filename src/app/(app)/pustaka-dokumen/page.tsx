"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/badge";
import { useAppContext } from "@/context/app-context";
import { projectId } from "@/lib/projects";
import type { StatusKind } from "@/lib/sample-data";
import styles from "./page.module.css";

type DocumentRow = {
  id: string;
  nama: string;
  disiplin: string | null;
  tipe: string | null;
  ukuran: string | null;
  blob_url: string;
  status: string;
  created_at: string;
};

const DISIPLIN = ["-", "Struktur", "Arsitektur", "MEP", "Infrastruktur"] as const;

const ACCEPT = ".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg";

const MULTIPART_MIN_BYTE = 5 * 1024 * 1024;

const STATUS_KIND: Record<string, StatusKind> = {
  diproses: "success",
  memproses: "warning",
  gagal: "danger",
};

export default function PustakaDokumenPage() {
  const { activeProject } = useAppContext();
  const proyekId = projectId(activeProject);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  // Status memuat diturunkan dari proyek mana yang datanya sudah masuk, bukan
  // disimpan terpisah — menyetel state secara sinkron di dalam effect memicu
  // render beruntun dan dilarang react-hooks/set-state-in-effect.
  const [dimuatUntuk, setDimuatUntuk] = useState<string | null>(null);
  const memuat = dimuatUntuk !== proyekId;
  const [galat, setGalat] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [disiplin, setDisiplin] = useState<string>(DISIPLIN[0]);
  const [progres, setProgres] = useState<{ nama: string; persen: number } | null>(null);
  const [menghapus, setMenghapus] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  // Penanda unggahan yang sedang berjalan. `onUploadProgress` masih mengirim
  // event 100% setelah upload() selesai; tanpa penanda ini event tersebut
  // menulis ulang progres yang baru dibersihkan dan tombol tersangkut selamanya.
  const unggahKe = useRef(0);
  const muatKe = useRef(0);

  const muatDaftar = useCallback(async () => {
    // Ganti proyek dua kali dengan cepat bisa membuat respons lama datang
    // belakangan; hanya permintaan terbaru yang boleh menulis state.
    const iniMuat = ++muatKe.current;

    try {
      const res = await fetch(`/api/documents?projectId=${encodeURIComponent(proyekId)}`);
      const data = await res.json();
      if (muatKe.current !== iniMuat) return;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDocuments(data.documents);
      setGalat(null);
    } catch (error) {
      if (muatKe.current !== iniMuat) return;
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      if (muatKe.current === iniMuat) setDimuatUntuk(proyekId);
    }
  }, [proyekId]);

  useEffect(() => {
    // muatDaftar hanya menyetel state setelah await fetch, jadi tidak ada
    // render beruntun sinkron; aturannya tidak menelusuri batas async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muatDaftar();
  }, [muatDaftar]);

  async function tanganiBerkas(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Direset lebih dulu supaya memilih berkas yang sama dua kali tetap memicu onChange.
    event.target.value = "";
    if (!file) return;

    const iniUnggahan = ++unggahKe.current;
    setGalat(null);
    setProgres({ nama: file.name, persen: 0 });

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
        // Multipart hanya untuk berkas besar (gambar & RKS); berkas kecil tidak
        // perlu ongkos protokolnya.
        multipart: file.size > MULTIPART_MIN_BYTE,
        clientPayload: JSON.stringify({
          nama: file.name,
          projectId: proyekId,
          disiplin: disiplin === "-" ? null : disiplin,
        }),
        onUploadProgress: ({ percentage }) => {
          if (unggahKe.current !== iniUnggahan) return;
          setProgres({ nama: file.name, persen: Math.round(percentage) });
        },
      });

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pathname: blob.pathname,
          nama: file.name,
          projectId: proyekId,
          disiplin: disiplin === "-" ? null : disiplin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      await muatDaftar();
    } catch (error) {
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      // Dinaikkan lebih dulu supaya event progres yang telat diabaikan.
      unggahKe.current += 1;
      setProgres(null);
    }
  }

  async function hapus(dokumen: DocumentRow) {
    if (!window.confirm(`Hapus "${dokumen.nama}"? Berkasnya ikut terhapus permanen.`)) return;

    setMenghapus(dokumen.id);
    try {
      const res = await fetch(`/api/documents/${dokumen.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      await muatDaftar();
    } catch (error) {
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      setMenghapus(null);
    }
  }

  const terlihat = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return documents;
    return documents.filter(
      (doc) =>
        doc.nama.toLowerCase().includes(kunci) ||
        (doc.disiplin ?? "").toLowerCase().includes(kunci),
    );
  }, [documents, cari]);

  return (
    <div className={styles.page}>
      <div className={styles.actionRow}>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={tanganiBerkas}
          className={styles.hiddenInput}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={progres !== null}
        >
          {progres ? `Mengunggah… ${progres.persen}%` : "+ Upload dokumen"}
        </button>

        <select
          className={`input ${styles.disiplin}`}
          value={disiplin}
          onChange={(event) => setDisiplin(event.target.value)}
          aria-label="Disiplin dokumen"
        >
          {DISIPLIN.map((item) => (
            <option key={item} value={item}>
              {item === "-" ? "Tanpa disiplin" : item}
            </option>
          ))}
        </select>

        <input
          className={`input ${styles.search}`}
          placeholder="Cari dokumen…"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
        />
        <div className={styles.spacer} />
        <span className="tag tag-outline">{activeProject}</span>
      </div>

      {progres && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progres.persen}%` }} />
        </div>
      )}

      {galat && (
        <div className={`card elev-sm ${styles.error}`}>
          <b>Gagal memuat atau mengunggah dokumen.</b>
          <div className={styles.errorDetail}>{galat}</div>
          {/relation .* does not exist|does not exist/i.test(galat) && (
            <div className={styles.errorDetail}>
              Tabelnya belum dibuat. Jalankan <span className={styles.mono}>POST /api/setup</span>{" "}
              sekali — lihat halaman <a href="/status">/status</a>.
            </div>
          )}
        </div>
      )}

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Nama berkas</th>
              <th>Tipe</th>
              <th>Disiplin</th>
              <th>Ukuran</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {terlihat.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <a href={doc.blob_url} target="_blank" rel="noreferrer">
                    {doc.nama}
                  </a>
                </td>
                <td>{labelTipe(doc.tipe)}</td>
                <td>{doc.disiplin ?? "-"}</td>
                <td>{formatUkuran(doc.ukuran)}</td>
                <td>{formatTanggal(doc.created_at)}</td>
                <td>
                  <Badge kind={STATUS_KIND[doc.status] ?? "neutral"}>{doc.status}</Badge>
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.deleteBtn}`}
                    onClick={() => hapus(doc)}
                    disabled={menghapus === doc.id}
                  >
                    {menghapus === doc.id ? "Menghapus…" : "Hapus"}
                  </button>
                </td>
              </tr>
            ))}
            {terlihat.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {memuat
                    ? "Memuat…"
                    : documents.length === 0
                      ? "Belum ada dokumen untuk proyek ini. Mulai dengan Upload dokumen."
                      : "Tidak ada dokumen yang cocok dengan pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card elev-sm">
        <div className="card-title">Tanya Dokumen</div>
        <p className="card-body">
          Tanya-jawab atas isi dokumen belum tersambung — perlu ekstraksi teks PDF lebih dulu.
          Endpoint <span className={styles.mono}>POST /api/ai/ask</span> sudah aktif untuk
          pertanyaan umum tanpa rujukan dokumen.
        </p>
      </div>
    </div>
  );
}

function labelTipe(tipe: string | null) {
  if (!tipe) return "-";
  if (tipe.includes("pdf")) return "PDF";
  if (tipe.includes("spreadsheet") || tipe.includes("ms-excel")) return "Excel";
  if (tipe.includes("wordprocessing")) return "Word";
  if (tipe.startsWith("image/")) return "Gambar";
  return tipe;
}

function formatUkuran(ukuran: string | null) {
  if (!ukuran) return "-";
  const byte = Number(ukuran);
  if (!Number.isFinite(byte)) return "-";
  if (byte >= 1024 * 1024) return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
  if (byte >= 1024) return `${Math.round(byte / 1024)} KB`;
  return `${byte} B`;
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
