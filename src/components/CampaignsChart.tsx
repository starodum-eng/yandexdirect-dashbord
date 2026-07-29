"use client";

import { useMemo } from "react";
import type { AccountStats } from "@/types/yandex";
import { MetricBarChart, type MetricItem } from "@/components/MetricBarChart";

interface CampaignsChartProps {
  accounts: AccountStats[];
}

// Bar chart comparing individual campaigns (across all accounts) by a
// switchable metric.
export function CampaignsChart({ accounts }: CampaignsChartProps) {
  const items = useMemo<MetricItem[]>(
    () =>
      accounts.flatMap((a) =>
        a.rows.map((r) => ({
          name: r.campaignName,
          sub: a.label,
          values: {
            cost: r.cost,
            cpa: r.conversions > 0 ? r.cost / r.conversions : 0,
            conversions: r.conversions,
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
          },
        })),
      ),
    [accounts],
  );

  return (
    <MetricBarChart
      title="Кампании"
      items={items}
      maxBars={12}
      emptyText="Нет данных по кампаниям за выбранный период."
    />
  );
}
