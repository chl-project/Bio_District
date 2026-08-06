// Pembacaan variabel lingkungan.
//
// Nama tidak bisa dipatok keras: integrasi Vercel mengizinkan awalan khusus saat
// store disambungkan, sehingga tokennya bisa bernama BIO_DISTRICT_BLOB_READ_WRITE_TOKEN
// alih-alih BLOB_READ_WRITE_TOKEN. Karena itu pencarian bertahap: nama baku dulu,
// lalu pola nama, lalu bentuk nilainya — yang terakhir ini berlaku apa pun namanya.

const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

const BLOB_TOKEN_KEYS = ["BLOB_READ_WRITE_TOKEN"] as const;

// Penyedia disimpulkan dari bentuk kunci, bukan dari nama variabelnya, jadi
// nama mana pun boleh dipakai — kunci Gemini di GEMINI_API_KEY tetap terbaca.
const OPENAI_KEY_KEYS = ["OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;

const APS_KEYS = ["APS_CLIENT_ID", "APS_CLIENT_SECRET"] as const;

export type EnvTemuan = { key: string; value: string } | null;

function firstDefined(keys: readonly string[]): EnvTemuan {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return { key, value };
  }
  return null;
}

/** Mencari variabel yang namanya cocok pola, mengabaikan yang kosong. */
function cariNama(pola: RegExp): EnvTemuan {
  for (const [key, value] of Object.entries(process.env)) {
    if (pola.test(key) && value && value.trim() !== "") return { key, value };
  }
  return null;
}

/** Mencari variabel dari bentuk nilainya — jaring terakhir saat namanya tak terduga. */
function cariNilai(awalan: string): EnvTemuan {
  for (const [key, value] of Object.entries(process.env)) {
    if (value?.startsWith(awalan)) return { key, value };
  }
  return null;
}

export function getDatabaseUrl(): EnvTemuan {
  return (
    firstDefined(DATABASE_URL_KEYS) ??
    cariNama(/(DATABASE_URL|POSTGRES_URL)$/) ??
    cariNilai("postgres://") ??
    cariNilai("postgresql://")
  );
}

export function getBlobToken(): EnvTemuan {
  return (
    firstDefined(BLOB_TOKEN_KEYS) ??
    cariNama(/READ_WRITE_TOKEN$/) ??
    cariNilai("vercel_blob_rw_")
  );
}

export function getOpenAiKey(): EnvTemuan {
  return firstDefined(OPENAI_KEY_KEYS) ?? cariNama(/(OPENAI|GEMINI|GOOGLE)_API_KEY$/);
}

/** APS butuh sepasang nilai; keduanya harus ada agar dianggap terpasang. */
export function getApsKredensial(): EnvTemuan {
  const id = firstDefined(APS_KEYS);
  const rahasia = firstDefined(["APS_CLIENT_SECRET"]);
  return id && rahasia ? id : null;
}

const PENCARI = {
  database: getDatabaseUrl,
  blob: getBlobToken,
  ai: getOpenAiKey,
  cad: getApsKredensial,
} as const;

export const ENV_KEYS = {
  database: DATABASE_URL_KEYS,
  blob: BLOB_TOKEN_KEYS,
  ai: OPENAI_KEY_KEYS,
  cad: APS_KEYS,
} as const;

/**
 * Nama variabel yang mirip dengan yang dicari, untuk pesan diagnostik.
 * Hanya nama — nilainya rahasia dan tidak boleh ikut keluar.
 */
export function namaMirip(group: keyof typeof ENV_KEYS): string[] {
  const pola: Record<keyof typeof ENV_KEYS, RegExp> = {
    database: /POSTGRES|DATABASE|NEON/i,
    blob: /BLOB|READ_WRITE_TOKEN/i,
    ai: /OPENAI|GEMINI|GOOGLE|ANTHROPIC/i,
    cad: /APS|AUTODESK|FORGE/i,
  };
  return Object.keys(process.env).filter((key) => pola[group].test(key)).sort();
}

/** Melempar error yang menyebut nama variabel, bukan `undefined` yang membingungkan. */
export function requireEnv(group: keyof typeof ENV_KEYS) {
  const found = PENCARI[group]();
  if (!found) {
    throw new Error(
      `Variabel lingkungan belum diset. Set salah satu dari: ${ENV_KEYS[group].join(", ")}`,
    );
  }
  return found.value;
}
