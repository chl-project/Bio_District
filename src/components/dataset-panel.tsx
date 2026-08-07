"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppContext } from "@/context/app-context";
import { hitungRingkasan } from "@/lib/dataset-analisa";
import { DATASETS, kolomRumus, type Lembar } from "@/lib/datasets";
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
  /** Gagal sebagian: datanya tersimpan, tetapi ada langkah lanjutan yang gagal. */
  const [peringatan, setPeringatan] = useState<string | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
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
    setPeringatan(null);
    setKabar(null);
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

      // Berkas yang terbaca tetapi kosong adalah kejadian yang paling sering
      // membingungkan: unggahan "berhasil" tetapi tabelnya tetap kosong, dan
      // tanpa pesan ini bentuknya sama persis dengan belum pernah mengunggah.
      if (impor.jumlahBaris === 0) {
        const rincian = (impor.perLembar ?? [])
          .map((item: { lembar: string; baris: number }) => `${item.lembar}: ${item.baris}`)
          .join(", ");
        // Dipakai peringatan, bukan galat: `muat()` membersihkan galat saat
        // berhasil, sehingga pesan ini akan langsung hilang lagi.
        setPeringatan(
          `Berkas "${file.name}" terbaca, tetapi tidak ada baris data di dalamnya (${rincian}). ` +
            `Pastikan ada baris di bawah baris judul kolom, dan baris judulnya tidak diubah. ` +
            `Template yang diunduh dari sini sudah berisi angka pembuka.`,
        );
      } else {
        setKabar(
          `${impor.jumlahBaris} baris terimpor dari "${file.name}" ` +
            `(${(impor.perLembar ?? [])
              .map((item: { lembar: string; baris: number }) => `${item.lembar} ${item.baris}`)
              .join(", ")}).`,
        );
      }

      setAnalisa(null);
      await muat();

      // Pengindeksan untuk Tanya Dokumen berjalan setelah impor tersimpan, dan
      // kegagalannya tidak membatalkan apa pun — tetapi harus tetap terlihat,
      // bukan hanya muncul sebagai 500 senyap di konsol peramban.
      try {
        const prosesRes = await fetch(`/api/documents/${daftar.document.id}/process`, {
          method: "POST",
        });
        if (!prosesRes.ok) {
          const proses = await prosesRes.json().catch(() => ({}));
          setPeringatan(
            `Data sudah tersimpan, tetapi pengindeksan untuk Tanya Dokumen gagal: ` +
              `${proses.error ?? `HTTP ${prosesRes.status}`}`,
          );
        }
      } catch (error) {
        setPeringatan(
          `Data sudah tersimpan, tetapi pengindeksan untuk Tanya Dokumen gagal: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
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
  const rumusLembar = definisiLembar ? kolomRumus(definisiLembar) : [];
  // Baris TOTAL yang sama dengan yang ditulis ke berkas Excel.
  const totalLembar = hitungTotal(definisiLembar, barisLembar);

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
        <a
          className={`btn btn-secondary ${baris.length === 0 ? styles.nonaktif : ""}`}
          href={`/api/datasets/${dataset}/hasil?projectId=${encodeURIComponent(proyekId)}`}
          download
          aria-disabled={baris.length === 0}
          onClick={(event) => {
            if (baris.length === 0) event.preventDefault();
          }}
          title={
            baris.length === 0
              ? "Unggah data terlebih dahulu"
              : "Excel berisi rumus hidup, kolom hitungan, dan baris TOTAL"
          }
        >
          ↓ Unduh hasil olahan (rumus)
        </a>
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
              {/* Angka tanpa asal-usulnya sulit dipercaya saat dipakai rapat. */}
              {item.rumus && <div className={styles.kartuRumus}>{item.rumus}</div>}
            </div>
          ))}
        </div>
      )}

      {kabar && <div className={`card elev-sm ${styles.kabar}`}>{kabar}</div>}

      {peringatan && (
        <div className={`card elev-sm ${styles.peringatan}`}>
          <b>Sebagian berhasil.</b>
          <div className={styles.errorDetail}>{peringatan}</div>
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
                    <th
                      key={kolom.kunci}
                      className={kolom.rumus ? styles.kolomRumus : undefined}
                      title={kolom.rumus?.teks}
                    >
                      {kolom.judul}
                      {kolom.rumus && <span className={styles.tandaRumus}>ƒ</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {barisLembar.map((row) => (
                  <tr key={`${row.lembar}-${row.urutan}`}>
                    {definisiLembar.kolom.map((kolom) => (
                      <td
                        key={kolom.kunci}
                        className={kolom.rumus ? styles.kolomRumus : undefined}
                      >
                        {formatSel(row.data[kolom.kunci], kolom.tipe)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {totalLembar && (
                <tfoot>
                  <tr>
                    {definisiLembar.kolom.map((kolom, indeks) => (
                      <td key={kolom.kunci} className={styles.total}>
                        {indeks === 0
                          ? "TOTAL"
                          : kolom.total
                            ? formatSel(totalLembar[kolom.kunci], kolom.tipe)
                            : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
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

      {definisiLembar && barisLembar.length > 0 && rumusLembar.length > 0 && (
        <div className="card elev-sm">
          <div className="card-kicker">Rumus perhitungan — {definisiLembar.nama}</div>
          <p className={styles.petunjuk}>
            Kolom bertanda ƒ tidak diisi manual. Berkas “Unduh hasil olahan” memuat rumus
            yang sama sebagai rumus Excel yang hidup, jadi perhitungannya bisa ditelusuri
            di bilah rumus.
          </p>
          <dl className={styles.rumusDaftar}>
            {rumusLembar.map((kolom) => (
              <div key={kolom.kunci} className={styles.rumusBaris}>
                <dt>{kolom.judul}</dt>
                <dd>{kolom.rumus?.teks}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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
  if (tipe === "persen" && typeof nilai === "number") {
    return `${nilai > 0 ? "+" : ""}${(nilai * 100).toFixed(1)}%`;
  }
  if (tipe === "angka" && typeof nilai === "number") {
    return nilai.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  }
  return String(nilai);
}

/**
 * Baris TOTAL untuk tabel di layar, memakai aturan yang sama dengan sel TOTAL
 * di berkas Excel: kolom `jumlah` dijumlahkan, kolom `rasio` dibagi dari dua
 * total lain — bukan dirata-ratakan, karena rata-rata persentase per baris
 * memberi angka yang berbeda dari selisih total terhadap pagu total.
 */
function hitungTotal(definisi: Lembar | undefined, baris: BarisTersimpan[]) {
  if (!definisi || baris.length === 0) return null;
  const berTotal = definisi.kolom.filter((kolom) => kolom.total);
  if (berTotal.length === 0) return null;

  const jumlahkan = (kunci: string) =>
    baris.reduce((total, row) => {
      const nilai = row.data[kunci];
      return total + (typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0);
    }, 0);

  const hasil: Record<string, number | null> = {};
  for (const kolom of berTotal) {
    const total = kolom.total!;
    if (total.jenis === "jumlah") {
      hasil[kolom.kunci] = jumlahkan(kolom.kunci);
    } else {
      const bawah = jumlahkan(total.bawah);
      hasil[kolom.kunci] = bawah === 0 ? null : jumlahkan(total.atas) / bawah;
    }
  }
  return hasil;
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
