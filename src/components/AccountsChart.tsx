"use client";

import { useMemo } from "react";
import type { AccountStats } from "@/types/yandex";
import { MetricBarChart, type MetricItem } from "@/components/MetricBarChart";

interface AccountsChartProps {
  accounts: AccountStats[];
}

// Bar chart comparing whole accounts by a switchable metric, using each
// account's aggregated totals.
export function AccountsChart({ accounts }: AccountsChartProps) {
  const items = useMemo<MetricItem[]>(
    () =>
      accounts.map((a) => ({
        name: a.label,
        values: {
          cost: a.totals.cost,
          cpa: a.totals.cpa,
          conversions: a.totals.conversions,
          clicks: a.totals.clicks,
          impressions: a.totals.impressions,
          ctr: a.totals.ctr,
        },
      })),
    [accounts],
  );

  return (
    <MetricBarChart
      title="Аккаунты"
      items={items}
      maxBars={50}
      emptyText="Нет данных по аккаунтам за выбранный период."
    />
  );
}
