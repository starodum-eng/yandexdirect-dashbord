"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicAccount } from "@/lib/accounts";
import type { SearchQueriesResponse } from "@/types/yandex";
import { type StatsFilters } from "@/hooks/useStats";
import { presetRange } from "@/lib/dateRanges";
import { FilterBar } from "@/components/FilterBar";
import { SearchQueriesTable } from "@/components/SearchQueriesTable";

interface SearchQueriesViewProps {
  accounts: PublicAccount[];
}

// Client-side view for the "ПС" (search queries) page: owns the filter state,
// fetches /api/search-queries and renders the sortable table.
export function SearchQueriesView({ accounts }: SearchQueriesViewProps) {
  const [filters, setFilters] = useState<StatsFilters>({
    ...presetRange("last30"),
    account: "all",
    client: "all",
  });
  const [data, setData] = useState<SearchQueriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (forceRefresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          account: filters.account,
          client: filters.client,
          refresh: forceRefresh ? "true" : "false",
        });
        const res = await fetch(`/api/search-queries?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Ошибка запроса (${res.status})`);
        }
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    },
    [filters.dateFrom, filters.dateTo, filters.account, filters.client],
  );

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  return (
    <div className="space-y-5">
      <FilterBar
        accounts={accounts}
        filters={filters}
        onChange={setFilters}
        onRefresh={() => void fetchData(true)}
        loading={loading}
      />

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!data && loading && (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          Загрузка данных…
        </div>
      )}

      {data && <SearchQueriesTable accounts={data.accounts} />}
    </div>
  );
}
