"use client";

import { useCallback, useEffect, useState } from "react";
import type { StatsResponse } from "@/types/yandex";

export interface StatsFilters {
  dateFrom: string;
  dateTo: string;
  account: string; // "all" or account id
}

interface UseStatsResult {
  data: StatsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void; // force refresh from the Yandex.Direct API
  reload: () => void; // re-fetch (may serve from cache)
}

// Fetches aggregated stats from /api/stats for the given filters. Re-fetches
// whenever the filters change; `refresh` forces a bypass of the server cache.
export function useStats(filters: StatsFilters): UseStatsResult {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(
    async (forceRefresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          account: filters.account,
          refresh: forceRefresh ? "true" : "false",
        });
        const res = await fetch(`/api/stats?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Ошибка запроса (${res.status})`);
        }
        const json: StatsResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    },
    [filters.dateFrom, filters.dateTo, filters.account],
  );

  useEffect(() => {
    void fetchStats(false);
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refresh: () => void fetchStats(true),
    reload: () => void fetchStats(false),
  };
}
