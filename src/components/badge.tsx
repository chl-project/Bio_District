import type { StatusKind } from "@/lib/sample-data";

export function Badge({ kind, children }: { kind: StatusKind; children: React.ReactNode }) {
  return <span className={`tag tag-status-${kind}`}>{children}</span>;
}
