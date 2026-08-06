import { deleteDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;

  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Id dokumen tidak valid." }, { status: 400 });
  }

  try {
    const terhapus = await deleteDocument(id);
    if (!terhapus) {
      return Response.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
