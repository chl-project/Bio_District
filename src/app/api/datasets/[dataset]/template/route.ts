import { buatTemplate } from "@/lib/dataset-excel";
import { ambilDataset, namaBerkasTemplate } from "@/lib/datasets";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/datasets/[dataset]/template">) {
  const { dataset: id } = await ctx.params;
  const dataset = ambilDataset(id);

  if (!dataset) {
    return Response.json({ error: `Dataset "${id}" tidak dikenal.` }, { status: 404 });
  }

  const buffer = await buatTemplate(dataset);
  const nama = namaBerkasTemplate(dataset);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // filename* memakai persentase agar spasi dan huruf non-ASCII aman di semua peramban.
      "content-disposition": `attachment; filename="template.xlsx"; filename*=UTF-8''${encodeURIComponent(nama)}`,
      "cache-control": "no-store",
    },
  });
}
