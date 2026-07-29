import { z } from "zod";

// Yandex.Direct accounts are configured through environment variables. Tokens
// never live in the database or in source code. Each account has its own
// standalone OAuth token (no agency Client-Login is required).
//
// Preferred format — one set of variables per account, so adding a new account
// means adding new variables without ever touching the existing ones:
//
//   YANDEX_ACCOUNT_ACC1_TOKEN=AQAA...     (required)
//   YANDEX_ACCOUNT_ACC1_LABEL=Client A    (optional, falls back to the key)
//   YANDEX_ACCOUNT_ACC2_TOKEN=AQAA...
//   YANDEX_ACCOUNT_ACC2_LABEL=Client B
//
// The <KEY> segment (e.g. ACC1) becomes the account id, lower-cased, and is
// used as the cache key for report snapshots. Keep it stable once chosen.
//
// Optional — restrict "leads" to specific Metrica goals (otherwise all
// conversions are counted):
//   YANDEX_ACCOUNT_ACC1_GOALS=12345,67890   (per account)
//   YANDEX_LEAD_GOALS=12345,67890           (global fallback for all accounts)
//
// Legacy format — a single JSON array (still supported for backward
// compatibility, merged with the per-account variables):
//
//   YANDEX_ACCOUNTS='[{"id":"acc1","label":"Client A","token":"AQAA..."}]'

const accountSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  token: z.string().min(1),
  // Metrica goal ids counted as "leads". Empty = count all conversions.
  goals: z.array(z.number().int().positive()).default([]),
});

const accountsSchema = z.array(accountSchema);

export type YandexAccount = z.infer<typeof accountSchema>;

// Account exposed to the client — WITHOUT the token.
export type PublicAccount = Pick<YandexAccount, "id" | "label">;

// Matches YANDEX_ACCOUNT_<KEY>_TOKEN and captures <KEY>.
const TOKEN_VAR_RE = /^YANDEX_ACCOUNT_(.+)_TOKEN$/;

let cached: YandexAccount[] | null = null;

// Parses a comma-separated list of positive integer goal ids.
function parseGoals(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

// Global fallback list of lead goal ids, used when an account has no own list.
function globalLeadGoals(): number[] {
  return parseGoals(process.env.YANDEX_LEAD_GOALS);
}

// Reads accounts declared as one set of variables per account.
function parsePerAccountVars(): YandexAccount[] {
  const accounts: YandexAccount[] = [];
  const fallback = globalLeadGoals();

  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(TOKEN_VAR_RE);
    if (!match) continue;

    const token = value?.trim();
    if (!token) continue; // ignore empty tokens

    const rawKey = match[1]; // e.g. "ACC1" or "CLIENT_A"
    const label = process.env[`YANDEX_ACCOUNT_${rawKey}_LABEL`]?.trim() || rawKey;
    const own = parseGoals(process.env[`YANDEX_ACCOUNT_${rawKey}_GOALS`]);

    accounts.push({
      id: rawKey.toLowerCase(),
      label,
      token,
      goals: own.length > 0 ? own : fallback,
    });
  }

  return accounts;
}

// Reads accounts declared in the legacy single-JSON variable.
function parseLegacyJson(): YandexAccount[] {
  const raw = process.env.YANDEX_ACCOUNTS;
  if (!raw) return [];

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

  // Apply the global lead-goals fallback to legacy entries without their own.
  const fallback = globalLeadGoals();
  return result.data.map((a) => ({
    ...a,
    goals: a.goals.length > 0 ? a.goals : fallback,
  }));
}

// Reads and validates the configured accounts from both formats. Per-account
// variables take precedence over a legacy JSON entry with the same id. Throws
// if nothing is configured so misconfiguration fails fast.
export function getAccounts(): YandexAccount[] {
  if (cached) return cached;

  // Legacy entries first, then per-account variables override by id.
  const byId = new Map<string, YandexAccount>();
  for (const acc of parseLegacyJson()) byId.set(acc.id, acc);
  for (const acc of parsePerAccountVars()) byId.set(acc.id, acc);

  const merged = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  const result = accountsSchema.min(1).safeParse(merged);
  if (!result.success) {
    throw new Error(
      "No Yandex.Direct accounts configured. Set YANDEX_ACCOUNT_<KEY>_TOKEN " +
        "variables (or the legacy YANDEX_ACCOUNTS JSON).",
    );
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
