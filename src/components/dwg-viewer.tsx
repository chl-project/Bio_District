"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./dwg-viewer.module.css";

const VERSI = "7.*";
const DASAR_VIEWER = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VERSI}`;

type Viewer = {
  start: () => number;
  finish: () => void;
  loadDocumentNode: (dokumen: unknown, simpul: unknown) => Promise<unknown>;
  setThemingColor?: (...args: unknown[]) => void;
};

type Autodesk = {
  Viewing: {
    Initializer: (opsi: Record<string, unknown>, siap: () => void) => void;
    GuiViewer3D: new (wadah: HTMLElement, konfigurasi?: Record<string, unknown>) => Viewer;
    Document: {
      load: (
        urn: string,
        sukses: (dokumen: { getRoot: () => { getDefaultGeometry: () => unknown } }) => void,
        gagal: (kode: number, pesan: string) => void,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    Autodesk?: Autodesk;
  }
}

/** Skrip viewer besar dan hanya boleh dimuat sekali per halaman. */
let pemuatan: Promise<void> | null = null;

function muatSkrip(): Promise<void> {
  if (window.Autodesk) return Promise.resolve();

  pemuatan ??= new Promise<void>((selesai, tolak) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${DASAR_VIEWER}/style.min.css`;
    document.head.appendChild(css);

    const skrip = document.createElement("script");
    skrip.src = `${DASAR_VIEWER}/viewer3D.min.js`;
    skrip.onload = () => selesai();
    skrip.onerror = () => {
      pemuatan = null;
      tolak(new Error("Skrip Autodesk Viewer gagal dimuat. Periksa koneksi ke Autodesk."));
    };
    document.head.appendChild(skrip);
  });

  return pemuatan;
}

export function DwgViewer({ urn, nama }: { urn: string; nama: string }) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let viewer: Viewer | null = null;
    let dibatalkan = false;

    async function jalankan() {
      try {
        await muatSkrip();
        if (dibatalkan) return;

        const Autodesk = window.Autodesk;
        const wadah = wadahRef.current;
        if (!Autodesk || !wadah) return;

        await new Promise<void>((selesai) => {
          Autodesk.Viewing.Initializer(
            {
              env: "AutodeskProduction2",
              api: "streamingV2",
              getAccessToken: async (
                beri: (token: string, kedaluwarsa: number) => void,
              ) => {
                const res = await fetch("/api/drawings/token");
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Token viewer tidak terbit.");
                beri(data.access_token, data.expires_in);
              },
            },
            selesai,
          );
        });
        if (dibatalkan) return;

        viewer = new Autodesk.Viewing.GuiViewer3D(wadah);
        viewer.start();

        await new Promise<void>((selesai, tolak) => {
          Autodesk.Viewing.Document.load(
            `urn:${urn}`,
            async (dokumen) => {
              try {
                await viewer?.loadDocumentNode(dokumen, dokumen.getRoot().getDefaultGeometry());
                selesai();
              } catch (error) {
                tolak(error);
              }
            },
            (kode, pesan) => tolak(new Error(`${pesan} (kode ${kode})`)),
          );
        });

        if (!dibatalkan) setSiap(true);
      } catch (error) {
        if (!dibatalkan) setGalat(error instanceof Error ? error.message : String(error));
      }
    }

    void jalankan();

    return () => {
      dibatalkan = true;
      // Viewer memegang konteks WebGL; tanpa finish() konteksnya bocor tiap ganti gambar.
      viewer?.finish();
    };
  }, [urn]);

  return (
    <div className={styles.bingkai}>
      <div className={styles.judul}>
        {nama}
        {!siap && !galat && <span className={styles.memuat}>memuat gambar…</span>}
      </div>
      {galat && <div className={styles.galat}>{galat}</div>}
      <div ref={wadahRef} className={styles.wadah} />
    </div>
  );
}
