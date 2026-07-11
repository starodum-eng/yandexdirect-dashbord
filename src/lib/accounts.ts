import { z } from "zod";

// Yandex.Direct accounts are configured entirely through the YANDEX_ACCOUNTS
// environment variable — a JSON array. Tokens never live in the database or in
// source code. Each account has its own standalone OAuth token (no agency
// Client-Login is required).
//
// Example:
//   YANDEX_ACCOUNTS='[{"id":"acc1","label":"Client A","token":"AQAA..."}]'

const accountSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  token: z.string().min(1),
});

const accountsSchema = z.array(accountSchema).min(1);

export type YandexAccount = z.infer<typeof accountSchema>;

// Account exposed to the client — WITHOUT the token.
export type PublicAccount = Pick<YandexAccount, "id" | "label">;

let cached: YandexAccount[] | null = null;

// Reads and validates the configured accounts. Throws if the env var is
// missing or malformed so misconfiguration fails fast.
export function getAccounts(): YandexAccount[] {
  if (cached) return cached;

  const raw = process.env.YANDEX_ACCOUNTS;
  if (!raw) {
    throw new Error("YANDEX_ACCOUNTS environment variable is not set.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("YANDEX_ACCOUNTS is not valid JSON.");
  }

  const result = accountsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`YANDEX_ACCOUNTS is invalid: ${result.error.message}`);
  }

  // Ensure ids are unique.
  const ids = new Set<string>();
  for (const acc of result.data) {
    if (ids.has(acc.id)) {
      throw new Error(`Duplicate account id in YANDEX_ACCOUNTS: ${acc.id}`);
    }
    ids.add(acc.id);
  }

  cached = result.data;
  return cached;
}

// Safe, token-free list for use in client components.
export function getPublicAccounts(): PublicAccount[] {
  return getAccounts().map(({ id, label }) => ({ id, label }));
}

export function getAccountById(id: string): YandexAccount | undefined {
  return getAccounts().find((a) => a.id === id);
}
