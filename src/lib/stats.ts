import { prisma } from "@/lib/prisma";
import { getAccountById, type YandexAccount } from "@/lib/accounts";
import { fetchAccountReport } from "@/lib/yandex/client";
import { fetchAccountBalance } from "@/lib/yandex/balance";
import { computeTotals } from "@/lib/yandex/report";
import type { AccountStats, CampaignRow } from "@/types/yandex";

// The report part of an account's stats (everything except the balance).
type AccountReportStats = Omit<AccountStats, "balance">;

// A snapshot is considered fresh for this many minutes. Requests within the
// window are served from the cache; older ones trigger a refresh from the API.
export const CACHE_TTL_MINUTES = Number(process.env.CACHE_TTL_MINUTES ?? "60");

function isFresh(refreshedAt: Date, ttlMinutes: number): boolean {
  const ageMs = Date.now() - refreshedAt.getTime();
  return ageMs < ttlMinutes * 60 * 1000;
}

interface GetAccountStatsParams {
  account: YandexAccount;
  dateFrom: string;
  dateTo: string;
  forceRefresh?: boolean;
}

// Returns stats for a single account: the report (from cache or API) and the
// account balance, fetched in parallel. Balance failures degrade to null and
// never affect the report.
export async function getAccountStats(
  params: GetAccountStatsParams,
): Promise<AccountStats> {
  const [report, balance] = await Promise.all([
    getAccountReportStats(params),
    fetchAccountBalance(params.account, params.forceRefresh ?? false),
  ]);
  return { ...report, balance };
}

// Returns the report part of an account's stats, served from the cached
// snapshot when fresh (or when the API refresh fails), otherwise refreshed from
// the API and written back to the cache.
async function getAccountReportStats({
  account,
  dateFrom,
  dateTo,
  forceRefresh = false,
}: GetAccountStatsParams): Promise<AccountReportStats> {
  const existing = await prisma.reportSnapshot.findUnique({
    where: {
      accountId_dateFrom_dateTo: {
        accountId: account.id,
        dateFrom,
        dateTo,
      },
    },
  });

  const canUseCache =
    !forceRefresh &&
    existing !== null &&
    isFresh(existing.refreshedAt, CACHE_TTL_MINUTES);

  if (canUseCache && existing) {
    const rows = existing.rows as unknown as CampaignRow[];
    return {
      accountId: account.id,
      label: account.label,
      totals: computeTotals(rows),
      rows,
      refreshedAt: existing.refreshedAt.toISOString(),
    };
  }

  // Cache is stale or missing (or a refresh was forced): hit the API.
  try {
    const rows = await fetchAccountReport({ account, dateFrom, dateTo });

    const saved = await prisma.reportSnapshot.upsert({
      where: {
        accountId_dateFrom_dateTo: {
          accountId: account.id,
          dateFrom,
          dateTo,
        },
      },
      update: { rows: rows as unknown as object, refreshedAt: new Date() },
      create: {
        accountId: account.id,
        dateFrom,
        dateTo,
        rows: rows as unknown as object,
      },
    });

    return {
      accountId: account.id,
      label: account.label,
      totals: computeTotals(rows),
      rows,
      refreshedAt: saved.refreshedAt.toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Fall back to the stale cache if we have one, so the UI degrades gracefully.
    if (existing) {
      const rows = existing.rows as unknown as CampaignRow[];
      return {
        accountId: account.id,
        label: account.label,
        totals: computeTotals(rows),
        rows,
        refreshedAt: existing.refreshedAt.toISOString(),
        error: `Показаны кэшированные данные: ${message}`,
      };
    }

    return {
      accountId: account.id,
      label: account.label,
      totals: computeTotals([]),
      rows: [],
      refreshedAt: null,
      error: message,
    };
  }
}

interface GetStatsParams {
  accountIds: string[];
  dateFrom: string;
  dateTo: string;
  forceRefresh?: boolean;
}

// Fetches stats for several accounts in parallel.
export async function getStatsForAccounts({
  accountIds,
  dateFrom,
  dateTo,
  forceRefresh = false,
}: GetStatsParams): Promise<AccountStats[]> {
  const accounts = accountIds
    .map((id) => getAccountById(id))
    .filter((a): a is YandexAccount => a !== undefined);

  return Promise.all(
    accounts.map((account) =>
      getAccountStats({ account, dateFrom, dateTo, forceRefresh }),
    ),
  );
}
