import {
  BmwIcon,
  DashboardIcon,
  KelayakanIcon,
  KompositIcon,
  PustakaIcon,
  SpesifikasiIcon,
} from "@/components/icons";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/studi-kelayakan", label: "Studi Kelayakan", Icon: KelayakanIcon },
  { href: "/spesifikasi-material", label: "Spesifikasi Material", Icon: SpesifikasiIcon },
  { href: "/komposit-drawing", label: "Komposit Drawing", Icon: KompositIcon },
  { href: "/analisa-bmw", label: "Analisa Biaya–Mutu–Waktu", Icon: BmwIcon },
  { href: "/pustaka-dokumen", label: "Pustaka Dokumen", Icon: PustakaIcon },
] as const;
