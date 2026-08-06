// Autodesk Platform Services — konversi DWG agar bisa ditampilkan di peramban.
//
// DWG adalah format biner tertutup; tidak ada pustaka JavaScript yang bisa
// membacanya. Satu-satunya jalur yang layak adalah menerjemahkannya lewat APS
// menjadi SVF2, lalu menampilkannya dengan Autodesk Viewer.
//
// Setiap langkah memberi pesan yang menyebut langkahnya sendiri. Integrasi ini
// punya banyak titik gagal — kredensial, bucket, unggahan, terjemahan — dan
// tanpa itu semuanya muncul sebagai "gagal" tanpa keterangan.

const DASAR = "https://developer.api.autodesk.com";

const LINGKUP = [
  "data:read",
  "data:write",
  "data:create",
  "bucket:create",
  "bucket:read",
  "viewables:read",
].join(" ");

export class GalatAps extends Error {
  constructor(
    readonly langkah: string,
    pesan: string,
    readonly status?: number,
  ) {
    super(`[${langkah}] ${pesan}`);
    this.name = "GalatAps";
  }
}

function kredensial() {
  const id = process.env.APS_CLIENT_ID;
  const rahasia = process.env.APS_CLIENT_SECRET;
  if (!id || !rahasia) {
    throw new GalatAps(
      "kredensial",
      "APS_CLIENT_ID dan APS_CLIENT_SECRET belum diset di runtime ini.",
    );
  }
  return { id, rahasia };
}

/**
 * Nama bucket harus unik di seluruh APS, bukan hanya di akun ini — karena itu
 * diawali client id yang sudah unik. Bisa ditimpa lewat APS_BUCKET.
 */
export function namaBucket() {
  const custom = process.env.APS_BUCKET;
  if (custom) return custom.toLowerCase();
  const { id } = kredensial();
  return `bio-district-${id.toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 128);
}

let tokenTersimpan: { nilai: string; kedaluwarsa: number } | null = null;

export async function tokenAps(): Promise<string> {
  // Disegarkan 60 detik lebih awal agar tidak kedaluwarsa di tengah rangkaian panggilan.
  if (tokenTersimpan && Date.now() < tokenTersimpan.kedaluwarsa - 60_000) {
    return tokenTersimpan.nilai;
  }

  const { id, rahasia } = kredensial();
  const res = await fetch(`${DASAR}/authentication/v2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${rahasia}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: LINGKUP }),
  });

  if (!res.ok) {
    throw new GalatAps(
      "token",
      `Kredensial ditolak Autodesk: ${await ringkasGalat(res)}`,
      res.status,
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenTersimpan = {
    nilai: data.access_token,
    kedaluwarsa: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function pastikanBucket(token: string) {
  const bucketKey = namaBucket();
  const res = await fetch(`${DASAR}/oss/v2/buckets`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ bucketKey, policyKey: "persistent" }),
  });

  // 409 berarti bucket sudah ada — itu hasil yang diinginkan, bukan kegagalan.
  if (res.ok || res.status === 409) return bucketKey;

  throw new GalatAps("bucket", `Bucket "${bucketKey}" gagal disiapkan: ${await ringkasGalat(res)}`, res.status);
}

/**
 * Memindahkan berkas dari Vercel Blob ke penyimpanan APS lewat URL bertanda
 * tangan. Isinya dialirkan langsung, tidak ditampung di memori, supaya gambar
 * berukuran besar tidak menghabiskan jatah memori fungsi.
 */
export async function unggahKeAps(token: string, objectKey: string, sumberUrl: string) {
  const bucketKey = await pastikanBucket(token);
  const jalur = `${DASAR}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`;

  const tandaRes = await fetch(`${jalur}?minutesExpiration=60`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!tandaRes.ok) {
    throw new GalatAps("url-unggah", await ringkasGalat(tandaRes), tandaRes.status);
  }
  const tanda = (await tandaRes.json()) as { uploadKey: string; urls: string[] };
  if (!tanda.urls?.length) {
    throw new GalatAps("url-unggah", "Autodesk tidak mengembalikan URL unggahan.");
  }

  const berkas = await fetch(sumberUrl);
  if (!berkas.ok || !berkas.body) {
    throw new GalatAps("ambil-berkas", `Berkas tidak terbaca dari Blob (HTTP ${berkas.status}).`);
  }

  const panjang = berkas.headers.get("content-length");
  const putRes = await fetch(tanda.urls[0], {
    method: "PUT",
    body: berkas.body,
    // duplex wajib saat body berupa aliran, bukan buffer.
    duplex: "half",
    headers: panjang ? { "content-length": panjang } : undefined,
  } as RequestInit & { duplex: "half" });

  if (!putRes.ok) {
    throw new GalatAps("unggah", `Penyimpanan Autodesk menolak berkas (HTTP ${putRes.status}).`, putRes.status);
  }

  const selesaiRes = await fetch(jalur, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ uploadKey: tanda.uploadKey }),
  });
  if (!selesaiRes.ok) {
    throw new GalatAps("finalisasi", await ringkasGalat(selesaiRes), selesaiRes.status);
  }

  const objek = (await selesaiRes.json()) as { objectId: string };
  return { objectId: objek.objectId, urn: keUrn(objek.objectId) };
}

/** URN Model Derivative adalah objectId dalam base64 varian URL tanpa padding. */
export function keUrn(objectId: string) {
  return Buffer.from(objectId).toString("base64url").replace(/=+$/, "");
}

export async function mulaiTerjemahan(token: string, urn: string) {
  const res = await fetch(`${DASAR}/modelderivative/v2/designdata/job`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      // Menerjemahkan ulang bila berkas dengan URN sama pernah diproses.
      "x-ads-force": "true",
    },
    body: JSON.stringify({
      input: { urn },
      output: { formats: [{ type: "svf2", views: ["2d", "3d"] }] },
    }),
  });

  if (!res.ok) {
    throw new GalatAps("terjemahan", await ringkasGalat(res), res.status);
  }
  return (await res.json()) as { result: string };
}

export type StatusTerjemahan = {
  status: "pending" | "inprogress" | "success" | "failed" | "timeout";
  progress: string;
  pesan?: string;
};

export async function statusTerjemahan(token: string, urn: string): Promise<StatusTerjemahan> {
  const res = await fetch(`${DASAR}/modelderivative/v2/designdata/${urn}/manifest`, {
    headers: { authorization: `Bearer ${token}` },
  });

  // Manifest belum ada berarti pekerjaannya baru mengantre.
  if (res.status === 404) return { status: "pending", progress: "0%" };
  if (!res.ok) throw new GalatAps("manifest", await ringkasGalat(res), res.status);

  const data = (await res.json()) as {
    status: StatusTerjemahan["status"];
    progress: string;
    derivatives?: { messages?: { message?: string | string[] }[] }[];
  };

  const pesan = data.derivatives
    ?.flatMap((turunan) => turunan.messages ?? [])
    .flatMap((item) => (Array.isArray(item.message) ? item.message : [item.message]))
    .filter(Boolean)
    .join("; ");

  return { status: data.status, progress: data.progress, pesan: pesan || undefined };
}

async function ringkasGalat(res: Response) {
  const teks = await res.text().catch(() => "");
  try {
    const data = JSON.parse(teks) as {
      developerMessage?: string;
      reason?: string;
      errorMessage?: string;
      detail?: string;
    };
    const pesan =
      data.developerMessage ?? data.reason ?? data.errorMessage ?? data.detail;
    if (pesan) return `${pesan} (HTTP ${res.status})`;
  } catch {
    // Bukan JSON — pakai potongan teks mentahnya.
  }
  return `HTTP ${res.status} ${teks.slice(0, 200)}`;
}
