import OpenAI from "openai";

import { OPENAI_MODEL, requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = [
  "Anda asisten studi kelayakan konstruksi & perumahan untuk Cipta Harmoni Lestari.",
  "Jawab ringkas dalam Bahasa Indonesia, rujuk standar SNI bila relevan.",
  "Keluaran bersifat indikatif untuk pengambilan keputusan awal dan tidak menggantikan",
  "perhitungan struktur, dokumen perizinan, maupun tanda tangan tenaga ahli bersertifikat.",
].join(" ");

export async function POST(request: Request) {
  let pertanyaan: unknown;
  try {
    ({ pertanyaan } = await request.json());
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  if (typeof pertanyaan !== "string" || pertanyaan.trim() === "") {
    return Response.json({ error: "Field `pertanyaan` wajib diisi." }, { status: 400 });
  }

  try {
    const client = new OpenAI({ apiKey: requireEnv("ai") });
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: pertanyaan },
      ],
    });

    return Response.json({
      jawaban: completion.choices[0]?.message?.content ?? "",
      model: completion.model,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
