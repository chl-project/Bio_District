"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/badge";
import { DwgViewer } from "@/components/dwg-viewer";
import { useAppContext } from "@/context/app-context";
import { projectId } from "@/lib/projects";
import type { StatusKind } from "@/lib/sample-data";
import styles from "./drawing-panel.module.css";

type Gambar = {
  id: string;
  nama: string;
  disiplin: string | null;
  status: string;
  pesan_proses: string | null;
  created_at: string;
};

const EKSTENSI = ["dwg", "dxf"];
const ACCEPT = EKSTENSI.map((item) => `.${item}`).join(",");
const DISIPLIN = ["-", "Struktur", "Arsitektur", "MEP", "Infrastruktur"] as const;

const KIND: Record<string, StatusKind> = {
  siap: "success",
  success: "success",
  memproses: "warning",
  inprogress: "warning",
  pending: "warning",
  menunggu: "warning",
  gagal: "danger",
  failed: "danger",
};

const LABEL: Record<string, string> = {
  siap: "Siap dilihat ✓",
  memproses: "Dikonversi…",
  menunggu: "Menunggu",
  gagal: "Gagal",
  dilewati: "Belum dikonversi",
};

/** Tidak memakai state komponen, jadi tetap stabil di luar render. */
async function tandai(id: string, status: string, pesan: string | null) {
  await fetch(`/api/documents/${id}/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status, pesan }),
  }).catch(() => undefined);
}

export function DrawingPanel() {
  const { activeProject } = useAppContext();
  const proyekId = projectId(activeProject);

  const [gambar, setGambar] = useState<Gambar[]>([]);
  const [dipilih, setDipilih] = useState<{ id: string; urn: string; nama: string } | null>(null);
  const [disiplin, setDisiplin] = useState<string>(DISIPLIN[0]);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const muatKe = useRef(0);

  const muat = useCallback(async () => {
    const iniMuat = ++muatKe.current;
    try {
      const res = await fetch(`/api/documents?projectId=${encodeURIComponent(proyekId)}`);
      const data = await res.json();
      if (muatKe.current !== iniMuat) return;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGambar(
        (data.documents as Gambar[]).filter((doc) =>
          EKSTENSI.includes(doc.nama.split(".").pop()?.toLowerCase() ?? ""),
        ),
      );
      setGalat(null);
    } catch (error) {
      if (muatKe.current !== iniMuat) return;
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      if (muatKe.current === iniMuat) setMemuat(false);
    }
  }, [proyekId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muat();
  }, [muat]);

  async function tanganiBerkas(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const ekstensi = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EKSTENSI.includes(ekstensi)) {
      setGalat(`Hanya ${ACCEPT} yang bisa dikonversi. Berkas ".${ekstensi}" tidak didukung.`);
      return;
    }

    setGalat(null);
    setSibuk("Mengunggah…");

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/documents/upload",
        multipart: file.size > 5 * 1024 * 1024,
        clientPayload: JSON.stringify({
          nama: file.name,
          projectId: proyekId,
          disiplin: disiplin === "-" ? null : disiplin,
        }),
      });

      setSibuk("Mencatat…");
      const daftarRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pathname: blob.pathname,
          nama: file.name,
          projectId: proyekId,
          disiplin: disiplin === "-" ? null : disiplin,
        }),
      });
      const daftar = await daftarRes.json();
      if (!daftarRes.ok) throw new Error(daftar.error ?? `HTTP ${daftarRes.status}`);

      setSibuk("Mengirim ke Autodesk…");
      const konversiRes = await fetch(`/api/drawings/${daftar.document.id}`, { method: "POST" });
      const konversi = await konversiRes.json();
      if (!konversiRes.ok) throw new Error(konversi.error ?? `HTTP ${konversiRes.status}`);

      await muat();
      await pantau(daftar.document.id, file.name);
    } catch (error) {
      setGalat(error instanceof Error ? error.message : String(error));
    } finally {
      setSibuk(null);
    }
  }

  /**
   * Konversi berjalan di sisi Autodesk dan bisa memakan beberapa menit untuk
   * gambar besar, jadi statusnya ditanyakan berkala sampai selesai.
   */
  const pantau = useCallback(
    async (id: string, nama: string) => {
      for (let percobaan = 0; percobaan < 60; percobaan++) {
        await new Promise((lanjut) => setTimeout(lanjut, percobaan < 5 ? 3000 : 8000));

        const res = await fetch(`/api/drawings/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setGalat(data.error ?? `HTTP ${res.status}`);
          return;
        }

        setSibuk(`Dikonversi Autodesk… ${data.progress ?? ""}`.trim());

        if (data.status === "success") {
          await tandai(id, "siap", null);
          setDipilih({ id, urn: data.urn, nama });
          await muat();
          return;
        }
        if (data.status === "failed" || data.status === "timeout") {
          await tandai(id, "gagal", data.pesan ?? "Autodesk gagal mengonversi gambar ini.");
          setGalat(data.pesan ?? "Autodesk gagal mengonversi gambar ini.");
          await muat();
          return;
        }
      }
      setGalat("Konversi belum selesai setelah beberapa menit. Coba muat ulang halaman nanti.");
    },
    [muat],
  );

  async function buka(item: Gambar) {
    setGalat(null);
    const res = await fetch(`/api/drawings/${item.id}`);
    const data = await res.json();
    if (!res.ok) {
      setGalat(data.error ?? `HTTP ${res.status}`);
      return;
    }
    if (data.status === "success" && data.urn) {
      setDipilih({ id: item.id, urn: data.urn, nama: item.nama });
      return;
    }
    if (!data.urn) {
      setSibuk("Mengirim ke Autodesk…");
      const kirim = await fetch(`/api/drawings/${item.id}`, { method: "POST" });
      const hasil = await kirim.json();
      setSibuk(null);
      if (!kirim.ok) {
        setGalat(hasil.error ?? `HTTP ${kirim.status}`);
        return;
      }
    }
    void pantau(item.id, item.nama);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.aksi}>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={tanganiBerkas}
          className={styles.hidden}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => fileRef.current?.click()}
          disabled={sibuk !== null}
        >
          {sibuk ?? "+ Upload gambar DWG"}
        </button>

        <select
          className={`input ${styles.disiplin}`}
          value={disiplin}
          onChange={(event) => setDisiplin(event.target.value)}
          aria-label="Disiplin gambar"
        >
          {DISIPLIN.map((item) => (
            <option key={item} value={item}>
              {item === "-" ? "Tanpa disiplin" : item}
            </option>
          ))}
        </select>

        <div className={styles.spacer} />
        <span className="tag tag-outline">{activeProject}</span>
      </div>

      {galat && (
        <div className={`card elev-sm ${styles.error}`}>
          <b>Gagal mengunggah atau mengonversi gambar.</b>
          <div className={styles.errorDetail}>{galat}</div>
          <div className={styles.errorDetail}>
            Status sambungan Autodesk ada di <a href="/status">/status</a>.
          </div>
        </div>
      )}

      <div className={`card elev-sm ${styles.tableCard}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Nama berkas</th>
              <th>Disiplin</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gambar.map((item) => (
              <tr key={item.id}>
                <td>{item.nama}</td>
                <td>{item.disiplin ?? "-"}</td>
                <td>{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                <td title={item.pesan_proses ?? undefined}>
                  <Badge kind={KIND[item.status] ?? "neutral"}>
                    {LABEL[item.status] ?? item.status}
                  </Badge>
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.aksiBtn}`}
                    onClick={() => buka(item)}
                    disabled={sibuk !== null}
                  >
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
            {gambar.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.kosong}>
                  {memuat
                    ? "Memuat…"
                    : galat
                      ? "Daftar gambar tidak dapat dimuat — lihat pesan di atas."
                      : "Belum ada gambar DWG. Unggah untuk mulai."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dipilih && <DwgViewer urn={dipilih.urn} nama={dipilih.nama} />}
    </div>
  );
}
