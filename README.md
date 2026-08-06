# Harmoni Feasibility Studio

Aplikasi web internal untuk studi kelayakan proyek konstruksi & perumahan — Cipta Harmoni Lestari.

Implementasi **Tahap 1 (Design)** dari PRD v2.0: seluruh layar dalam bentuk rangka aplikasi
yang bisa diklik, memakai data contoh (proyek *Bio District Cilenggang*).

`Pustaka Dokumen` sudah memakai data nyata (Neon + Vercel Blob); lima layar lain masih
memakai data contoh. Lihat [Integrasi](#integrasi) di bawah.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kredensial, atau: vercel env pull .env.local
npm run dev                  # http://localhost:3000
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
  app/api/             route handler: health, setup, documents, ai
  components/          AppShell (sidebar + topbar), Badge, Segmented, ikon
  context/             state aplikasi: tema gelap, sidebar, proyek aktif
  lib/                 data contoh, konfigurasi navigasi, env/db/blob/health
```

Gaya visual memakai design system **Organic** (krem–terakota–sage, Caprasimo + Figtree,
sudut membulat). Token-nya ada di `src/app/globals.css`, diambil dari hasil ekspor Claude Design.

## Integrasi

Tiga layanan eksternal sesuai bagian 9 PRD. Semua diakses hanya dari sisi server —
tidak ada kredensial yang sampai ke peramban.

| Layanan | Variabel lingkungan | Dipakai oleh |
| --- | --- | --- |
| Neon Postgres | `DATABASE_URL` (alias: `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`) | `src/lib/db.ts` |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | `/api/documents/upload` |
| OpenAI | `OPENAI_API_KEY`, opsional `OPENAI_MODEL` | `/api/ai/ask` |

Integrasi Neon dan Blob di Vercel mengisi variabelnya sendiri saat store disambungkan;
`OPENAI_API_KEY` dan `SETUP_SECRET` diisi manual. **Variabel baru hanya berlaku setelah
Redeploy** — deployment lama tetap memakai nilai saat build-nya dibuat.

### Memastikan sudah jalan

Buka `/status` di peramban (atau `GET /api/health` untuk JSON). Halaman itu memeriksa
ketiga layanan satu per satu dan menyebutkan variabel mana yang terbaca, jadi kegagalan
bisa dilacak ke layanan tertentu — bukan sekadar "error". Tiap pemeriksaan dibatasi
8 detik supaya host yang tidak terjangkau tidak menggantung sampai fungsi time out.

`GET /api/health` mengembalikan `200` bila semua hijau, `503` bila ada yang belum siap.

### Membuat tabel

Sekali saja, setelah `/status` menunjukkan Neon hijau. Set `SETUP_SECRET` di Vercel lalu:

```bash
curl -X POST https://<domain-anda>/api/setup -H "x-setup-secret: <SETUP_SECRET>"
```

DDL-nya idempoten (`CREATE TABLE IF NOT EXISTS`), aman diulang. Endpoint ini dilindungi
header karena menjalankan DDL — tanpa `SETUP_SECRET` ia menolak dengan `503`.

### Endpoint

| Rute | Fungsi |
| --- | --- |
| `GET /api/health` | Status ketiga layanan |
| `POST /api/setup` | Membuat tabel (butuh `x-setup-secret`) |
| `GET /api/documents` | Daftar dokumen, filter opsional `?projectId=` |
| `POST /api/documents` | Mencatat berkas yang baru diunggah ke Blob |
| `DELETE /api/documents/[id]` | Menghapus baris beserta berkasnya di Blob |
| `POST /api/documents/upload` | Menerbitkan token unggah Blob |
| `POST /api/ai/ask` | Tanya-jawab, body `{ "pertanyaan": "…" }` |

Unggahan memakai **client upload** (`upload()` dari `@vercel/blob/client` menunjuk ke
`/api/documents/upload`), bukan `put()` di server, karena body Route Handler di Vercel
dibatasi 4.5 MB sedangkan RKS dan gambar umumnya lebih besar. Batas saat ini 50 MB,
dan multipart dipakai di atas 5 MB.

Pencatatan ke Neon dilakukan klien lewat `POST /api/documents` setelah unggahan selesai.
Callback `onUploadCompleted` tetap dipasang sebagai jaring pengaman, tapi tidak bisa jadi
jalur utama: ia tidak terpanggil di `localhost` (Blob perlu URL publik) dan datangnya
asinkron, sehingga daftar dokumen bisa terlihat kosong padahal unggahan sukses. Keduanya
idempoten pada `blob_path`. Ukuran, tipe, dan URL selalu diambil server lewat `head()` —
bukan dipercaya dari peramban.

## Layar yang sudah memakai data nyata

`Pustaka Dokumen` sudah tersambung penuh: unggah, cari, buka, dan hapus dokumen per
proyek. Lima layar lain masih memakai `src/lib/sample-data.ts`.

## Catatan

Keluaran aplikasi bersifat indikatif untuk pengambilan keputusan awal, dan tidak menggantikan
perhitungan struktur, dokumen perizinan, maupun tanda tangan tenaga ahli bersertifikat.

Tanya-jawab atas isi dokumen belum ada — perlu ekstraksi teks PDF lebih dulu (pdf.js).
Recharts juga belum diterapkan.
