"use client";

import { useState } from "react";
import type { PublicAccount } from "@/lib/accounts";
import { useStats, type StatsFilters } from "@/hooks/useStats";
import { isoDaysAgo, todayIso } from "@/lib/format";
import { FilterBar } from "@/components/FilterBar";
import { SummaryCards } from "@/components/SummaryCards";
import { AccountsBreakdown } from "@/components/AccountsBreakdown";
import { CampaignsTable } from "@/components/CampaignsTable";

interface StatsViewProps {
  accounts: PublicAccount[];
  mode: "summary" | "campaigns";
}

// Client-side view: owns the filter state, fetches stats, and renders either
// the overview (KPI cards + per-account breakdown) or the campaigns table.
export function StatsView({ accounts, mode }: StatsViewProps) {
  const [filters, setFilters] = useState<StatsFilters>({
    dateFrom: isoDaysAgo(30),
    dateTo: todayIso(),
    account: "all",
  });

  const { data, loading, error, refresh } = useStats(filters);

  return (
    <div className="space-y-5">
      <FilterBar
        accounts={accounts}
        filters={filters}
        onChange={setFilters}
        onRefresh={refresh}
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

      {data && (
        <>
          {mode === "summary" ? (
            <>
              <SummaryCards totals={data.totals} />
              <div>
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  По кабинетам
                </h2>
                <AccountsBreakdown accounts={data.accounts} />
              </div>
            </>
          ) : (
            <>
              <SummaryCards totals={data.totals} />
              <CampaignsTable accounts={data.accounts} />
            </>
          )}
        </>
      )}
    </div>
  );
}
