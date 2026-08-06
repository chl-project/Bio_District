import OpenAI from "openai";

import { hitungRingkasan } from "@/lib/dataset-analisa";
import { ambilDatasetBaris } from "@/lib/dataset-store";
import { ambilDataset, type Dataset } from "@/lib/datasets";
import { OPENAI_MODEL, requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Batas baris yang ikut dikirim, agar BOQ panjang tidak membengkakkan permintaan. */
const MAKS_BARIS_PER_LEMBAR = 80;

const SISTEM = [
  "Anda analis studi kelayakan konstruksi & perumahan untuk Cipta Harmoni Lestari.",
  "Anda diberi data terstruktur hasil unggahan pengguna beserta angka yang sudah dihitung sistem.",
  "Gunakan HANYA angka yang diberikan. Jangan mengarang nilai, tanggal, atau standar.",
  "Bila sebuah angka tidak ada dalam data, katakan datanya belum diisi — jangan menebak.",
  "Periksa juga kewajaran dan konsistensi antar-angka, misalnya biaya per unit yang tidak masuk akal,",
  "pendapatan yang tidak cocok dengan jumlah unit dikali harga, atau perizinan yang belum terbit",
  "padahal jadwal sudah berjalan. Sebutkan bila ada yang janggal.",
  "Tulis dalam Bahasa Indonesia dengan struktur: Ringkasan, Temuan utama, Risiko, Rekomendasi.",
  "Ringkas dan konkret; rujuk angkanya. Jangan memakai tabel.",
  "Tutup dengan satu kalimat bahwa keluaran ini indikatif untuk keputusan awal dan tidak",
  "menggantikan perhitungan tenaga ahli bersertifikat.",
].join(" ");

const FOKUS: Record<string, string> = {
  "studi-kelayakan":
    "Fokus pada kelayakan finansial (NPV, IRR, payback terhadap tingkat diskonto), " +
    "kewajaran harga jual dibanding pembanding pasar, kecukupan laju serapan, " +
    "dan risiko perizinan yang belum terbit.",
  "spesifikasi-material":
    "Fokus pada kepatuhan standar/SNI, item yang belum punya standar, " +
    "serta apakah alternatif yang diusulkan sepadan mutunya dengan penghematannya.",
  "analisa-bmw":
    "Fokus pada selisih RAB terhadap pagu per divisi, kecukupan rencana mutu " +
    "terhadap item pekerjaan berisiko, dan keterkaitan jalur kritis dengan biaya.",
};

function susunTabel(definisi: Dataset, baris: { lembar: string; data: Record<string, unknown> }[]) {
  const bagian: string[] = [];

  for (const lembar of definisi.lembar) {
    const isi = baris.filter((item) => item.lembar === lembar.nama);
    if (isi.length === 0) {
      bagian.push(`## ${lembar.nama}\n(belum diisi)`);
      continue;
    }

    const dipakai = isi.slice(0, MAKS_BARIS_PER_LEMBAR);
    const judul = lembar.kolom.map((kolom) => kolom.judul).join(" | ");
    const isiBaris = dipakai.map((item) =>
      lembar.kolom
        .map((kolom) => {
          const nilai = item.data[kolom.kunci];
          if (nilai === null || nilai === undefined || nilai === "") return "-";
          if (kolom.tipe === "ya-tidak") return nilai === true ? "ya" : "tidak";
          return String(nilai);
        })
        .join(" | "),
    );

    const catatan =
      isi.length > dipakai.length ? `\n(${isi.length - dipakai.length} baris lain tidak ditampilkan)` : "";
    bagian.push(`## ${lembar.nama}\n${judul}\n${isiBaris.join("\n")}${catatan}`);
  }

  return bagian.join("\n\n");
}

export async function POST(request: Request, ctx: RouteContext<"/api/datasets/[dataset]/analisa">) {
  const { dataset: id } = await ctx.params;
  const definisi = ambilDataset(id);
  if (!definisi) return Response.json({ error: `Dataset "${id}" tidak dikenal.` }, { status: 404 });

  let body: { projectId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }
  if (typeof body.projectId !== "string" || body.projectId === "") {
    return Response.json({ error: "Field `projectId` wajib diisi." }, { status: 400 });
  }

  try {
    const baris = await ambilDatasetBaris(body.projectId, id);
    if (baris.length === 0) {
      return Response.json(
        { error: "Belum ada data untuk dianalisa. Unggah template yang sudah diisi lebih dulu." },
        { status: 400 },
      );
    }

    const ringkasan = hitungRingkasan(id, baris);
    const angkaTerhitung = ringkasan
      .map((item) => `- ${item.label}: ${item.nilai}`)
      .join("\n");

    const client = new OpenAI({ apiKey: requireEnv("ai") });
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: `${SISTEM} ${FOKUS[id] ?? ""}` },
        {
          role: "user",
          content:
            `Dataset: ${definisi.judul}\n\n` +
            `Angka yang sudah dihitung sistem:\n${angkaTerhitung}\n\n` +
            `Data terunggah:\n\n${susunTabel(definisi, baris)}`,
        },
      ],
    });

    return Response.json({
      analisa: completion.choices[0]?.message?.content ?? "",
      ringkasan,
      model: completion.model,
    });
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    console.error("[api/datasets/analisa] gagal:", pesan);
    return Response.json({ error: pesan }, { status: 500 });
  }
}
