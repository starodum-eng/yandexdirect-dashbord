import type { YandexAccount } from "@/lib/accounts";

// The shared-account balance is not part of the Reports API. It is retrieved
// via the classic Live v4 "AccountManagement" method (Action: Get), which
// returns the account Amount. This call requires the OAuth token to have the
// financial-operations permission; report-only tokens will get an error, in
// which case we degrade gracefully and report the balance as unknown (null).
const LIVE_V4_ENDPOINT = "https://api.direct.yandex.com/live/v4/json/";

// Balance is not date-scoped and changes slowly, so a short in-memory cache
// avoids hitting the finance API on every dashboard request. On serverless this
// is best-effort (per warm instance) — correctness never depends on it.
const BALANCE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { value: number | null; at: number }>();

function readCache(accountId: string): number | null | undefined {
  const hit = cache.get(accountId);
  if (!hit) return undefined;
  if (Date.now() - hit.at > BALANCE_TTL_MS) return undefined;
  return hit.value;
}

// Returns the account balance in account currency units, or null when it can't
// be determined (missing permission, API error, unexpected shape, network).
export async function fetchAccountBalance(
  account: YandexAccount,
  forceRefresh = false,
): Promise<number | null> {
  if (!forceRefresh) {
    const cached = readCache(account.id);
    if (cached !== undefined) return cached;
  }

  const value = await requestBalance(account);
  cache.set(account.id, { value, at: Date.now() });
  return value;
}

async function requestBalance(account: YandexAccount): Promise<number | null> {
  try {
    const res = await fetch(LIVE_V4_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        method: "AccountManagement",
        token: account.token,
        param: { Action: "Get", SelectionCriteria: {} },
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json: unknown = await res.json();
    return extractAmount(json);
  } catch {
    return null;
  }
}

// Live v4 responds with { data: { Accounts: [{ Amount, ... }] } } on success,
// or { error_code, error_str } on failure. Parse defensively.
function extractAmount(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;

  const accounts = (data as { Accounts?: unknown }).Accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;

  const amount = (accounts[0] as { Amount?: unknown }).Amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}
