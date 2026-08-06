// Pembacaan variabel lingkungan. Nama variabel mengikuti apa yang di-inject
// otomatis oleh integrasi Vercel, dengan beberapa alias karena Neon/Vercel
// Postgres memakai nama berbeda tergantung cara penyambungannya.

const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

const BLOB_TOKEN_KEYS = ["BLOB_READ_WRITE_TOKEN"] as const;

const OPENAI_KEY_KEYS = ["OPENAI_API_KEY"] as const;

function firstDefined(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim() !== "") return { key, value };
  }
  return null;
}

export function getDatabaseUrl() {
  return firstDefined(DATABASE_URL_KEYS);
}

export function getBlobToken() {
  return firstDefined(BLOB_TOKEN_KEYS);
}

export function getOpenAiKey() {
  return firstDefined(OPENAI_KEY_KEYS);
}

export const ENV_KEYS = {
  database: DATABASE_URL_KEYS,
  blob: BLOB_TOKEN_KEYS,
  ai: OPENAI_KEY_KEYS,
} as const;

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/** Melempar error yang menyebut nama variabel, bukan `undefined` yang membingungkan. */
export function requireEnv(group: keyof typeof ENV_KEYS) {
  const found = firstDefined(ENV_KEYS[group]);
  if (!found) {
    throw new Error(
      `Variabel lingkungan belum diset. Set salah satu dari: ${ENV_KEYS[group].join(", ")}`,
    );
  }
  return found.value;
}
