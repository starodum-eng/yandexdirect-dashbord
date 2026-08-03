import { prisma } from "@/lib/prisma";
import { getAccountById, type YandexAccount } from "@/lib/accounts";
import { fetchAccountSearchQueries } from "@/lib/yandex/client";
import type { AccountSearchQueries, SearchQueryRow } from "@/types/yandex";

const CACHE_TTL_MINUTES = Number(process.env.CACHE_TTL_MINUTES ?? "60");

// Search-query reports can be large; keep the top rows by spend per account to
// bound the stored snapshot and the payload sent to the browser.
const MAX_ROWS = 500;

function isFresh(refreshedAt: Date): boolean {
  return Date.now() - refreshedAt.getTime() < CACHE_TTL_MINUTES * 60 * 1000;
}

function capRows(rows: SearchQueryRow[]): SearchQueryRow[] {
  return [...rows].sort((a, b) => b.cost - a.cost).slice(0, MAX_ROWS);
}

interface Params {
  account: YandexAccount;
  dateFrom: string;
  dateTo: string;
  forceRefresh?: boolean;
}

// Returns search queries for a single account, served from the cached snapshot
// when fresh, otherwise refreshed from the API. Degrades gracefully on error.
async function getAccountSearchQueries({
  account,
  dateFrom,
  dateTo,
  forceRefresh = false,
}: Params): Promise<AccountSearchQueries> {
  const base = {
    accountId: account.id,
    label: account.label,
    client: account.client,
  };

  const existing = await prisma.searchQuerySnapshot.findUnique({
    where: {
      accountId_dateFrom_dateTo: { accountId: account.id, dateFrom, dateTo },
    },
  });

  if (!forceRefresh && existing && isFresh(existing.refreshedAt)) {
    return {
      ...base,
      rows: existing.rows as unknown as SearchQueryRow[],
      refreshedAt: existing.refreshedAt.toISOString(),
    };
  }

  try {
    const fetched = await fetchAccountSearchQueries({
      account,
      dateFrom,
      dateTo,
    });
    const rows = capRows(fetched);

    const saved = await prisma.searchQuerySnapshot.upsert({
      where: {
        accountId_dateFrom_dateTo: { accountId: account.id, dateFrom, dateTo },
      },
      update: { rows: rows as unknown as object, refreshedAt: new Date() },
      create: {
        accountId: account.id,
        dateFrom,
        dateTo,
        rows: rows as unknown as object,
      },
    });

    return { ...base, rows, refreshedAt: saved.refreshedAt.toISOString() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (existing) {
      return {
        ...base,
        rows: existing.rows as unknown as SearchQueryRow[],
        refreshedAt: existing.refreshedAt.toISOString(),
        error: `Показаны кэшированные данные: ${message}`,
      };
    }

    return { ...base, rows: [], refreshedAt: null, error: message };
  }
}

interface ForAccountsParams {
  accountIds: string[];
  dateFrom: string;
  dateTo: string;
  forceRefresh?: boolean;
}

// Fetches search queries for several accounts in parallel.
export async function getSearchQueriesForAccounts({
  accountIds,
  dateFrom,
  dateTo,
  forceRefresh = false,
}: ForAccountsParams): Promise<AccountSearchQueries[]> {
  const accounts = accountIds
    .map((id) => getAccountById(id))
    .filter((a): a is YandexAccount => a !== undefined);

  return Promise.all(
    accounts.map((account) =>
      getAccountSearchQueries({ account, dateFrom, dateTo, forceRefresh }),
    ),
  );
}
