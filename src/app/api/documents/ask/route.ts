import OpenAI from "openai";

import { OPENAI_MODEL, requireEnv } from "@/lib/env";
import { cariRujukan } from "@/lib/indexing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SISTEM = [
  "Anda asisten studi kelayakan konstruksi & perumahan untuk Cipta Harmoni Lestari.",
  "Jawab HANYA berdasarkan kutipan dokumen yang diberikan. Jangan mengarang angka.",
  "Bila kutipannya tidak memuat jawaban, katakan terus terang bahwa dokumennya tidak menyebutkan hal itu.",
  "Bila antar-dokumen saling bertentangan, sebutkan perbedaannya dan dari berkas mana masing-masing berasal.",
  "Rujuk sumber dengan menyebut nama berkas dan lokasinya, mis. (RKS Struktur.pdf, hal. 12).",
  "Jawab ringkas dalam Bahasa Indonesia.",
].join(" ");

export async function POST(request: Request) {
  let pertanyaan: unknown;
  let projectId: unknown;

  try {
    ({ pertanyaan, projectId } = await request.json());
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  if (typeof pertanyaan !== "string" || pertanyaan.trim() === "") {
    return Response.json({ error: "Field `pertanyaan` wajib diisi." }, { status: 400 });
  }
  if (typeof projectId !== "string" || projectId.trim() === "") {
    return Response.json({ error: "Field `projectId` wajib diisi." }, { status: 400 });
  }

  try {
    const rujukan = await cariRujukan(projectId, pertanyaan);

    if (rujukan.length === 0) {
      return Response.json({
        jawaban:
          "Belum ada isi dokumen yang bisa dirujuk untuk proyek ini. " +
          "Unggah dokumen lalu tunggu statusnya menjadi “siap”.",
        rujukan: [],
      });
    }

    const konteks = rujukan
      .map((item, index) => `[${index + 1}] ${item.dokumen} — ${item.lokasi}\n${item.teks}`)
      .join("\n\n");

    const client = new OpenAI({ apiKey: requireEnv("ai") });
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SISTEM },
        { role: "user", content: `Kutipan dokumen:\n\n${konteks}\n\nPertanyaan: ${pertanyaan}` },
      ],
    });

    return Response.json({
      jawaban: completion.choices[0]?.message?.content ?? "",
      // Teks kutipan tidak ikut dikirim ke klien — cukup rujukannya.
      rujukan: rujukan.map(({ dokumen, lokasi }) => ({ dokumen, lokasi })),
    });
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    console.error("[api/documents/ask] gagal:", pesan);
    return Response.json({ error: pesan }, { status: 500 });
  }
}
