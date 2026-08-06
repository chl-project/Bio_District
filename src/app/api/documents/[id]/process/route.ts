import { prosesDokumen } from "@/lib/indexing";

export const dynamic = "force-dynamic";

// Ekstraksi + embedding satu dokumen bisa lewat dari batas bawaan 10 detik.
export const maxDuration = 60;

export async function POST(_request: Request, ctx: RouteContext<"/api/documents/[id]/process">) {
  const { id } = await ctx.params;

  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id dokumen tidak valid." }, { status: 400 });
  }

  try {
    return Response.json(await prosesDokumen(id));
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    console.error("[api/documents/process] gagal:", pesan);
    return Response.json({ error: pesan }, { status: 500 });
  }
}
