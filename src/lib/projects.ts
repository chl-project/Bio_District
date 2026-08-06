// Daftar proyek dipakai sisi klien (pemilih di topbar) maupun sisi server
// (seed tabel projects), jadi konstantanya tinggal di modul netral ini.

export const PROJECTS = [
  "Bio District Cilenggang",
  "Grand Cattleya Residence",
  "Kavling Nirwana Timur",
] as const;

export type ProjectName = (typeof PROJECTS)[number];

export const MAIN_PROJECT: ProjectName = "Bio District Cilenggang";

/** Id stabil untuk kolom projects.id — tidak ikut berubah bila nama proyek diperbaiki. */
export function projectId(nama: ProjectName): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const PROJECT_IDS = PROJECTS.map((nama) => ({ id: projectId(nama), nama }));
