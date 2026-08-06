# Harmoni Feasibility Studio

Aplikasi web internal untuk studi kelayakan proyek konstruksi & perumahan — Cipta Harmoni Lestari.

Implementasi **Tahap 1 (Design)** dari PRD v2.0: seluruh layar dalam bentuk rangka aplikasi
yang bisa diklik, memakai data contoh (proyek *Bio District Cilenggang*). Belum ada backend,
database, atau panggilan AI.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
```

Perintah lain: `npm run build`, `npm start`, `npm run lint`.

## Layar

Enam menu sesuai struktur navigasi yang dikunci di PRD:

| Rute | Menu |
| --- | --- |
| `/dashboard` | Ringkasan proyek & pintu masuk |
| `/studi-kelayakan` | Analisa legal, pasar, teknis, finansial |
| `/spesifikasi-material` | Pembedahan RKS & perbandingan alternatif |
| `/komposit-drawing` | Tumpuk & periksa gambar antar-disiplin |
| `/analisa-bmw` | BOQ/RAB, rencana mutu, jadwal, dan trade-off |
| `/pustaka-dokumen` | Repositori dokumen & tanya-jawab AI |

Yang sudah interaktif: navigasi sidebar (bisa diciutkan), mode terang/gelap, pemilih proyek,
sub-tab Studi Kelayakan, slider analisa sensitivitas (NPV/IRR ikut berubah), tab Biaya–Mutu–Waktu,
pemilih skenario trade-off, serta saklar tampil & opasitas layer pada Komposit Drawing.

## Struktur

```
src/
  app/(app)/           satu rute per layar, berbagi AppShell
  components/          AppShell (sidebar + topbar), Badge, Segmented, ikon
  context/             state aplikasi: tema gelap, sidebar, proyek aktif
  lib/                 data contoh + konfigurasi navigasi
```

Gaya visual memakai design system **Organic** (krem–terakota–sage, Caprasimo + Figtree,
sudut membulat). Token-nya ada di `src/app/globals.css`, diambil dari hasil ekspor Claude Design.

## Catatan

Keluaran aplikasi bersifat indikatif untuk pengambilan keputusan awal, dan tidak menggantikan
perhitungan struktur, dokumen perizinan, maupun tanda tangan tenaga ahli bersertifikat.

Stack untuk tahap berikutnya (Neon Postgres, Vercel Blob, OpenAI, pdf.js, Recharts) dijelaskan
di bagian 9 PRD dan belum diterapkan.
