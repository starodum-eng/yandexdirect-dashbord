"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountStats } from "@/types/yandex";
import { formatInt, formatMoney, formatPercent } from "@/lib/format";

// Single-series bar chart comparing campaigns by one selectable metric.
// Following the dataviz guidance: one job (magnitude comparison) → one form
// (horizontal bars, sorted), one colour (no legend for a single series),
// recessive grid, per-bar hover tooltip.

type MetricKey = "cost" | "cpa" | "conversions" | "clicks" | "impressions" | "ctr";

interface Metric {
  key: MetricKey;
  label: string;
  format: (n: number) => string;
}

const METRICS: Metric[] = [
  { key: "cost", label: "Расход", format: formatMoney },
  { key: "cpa", label: "CPA", format: formatMoney },
  { key: "conversions", label: "Конверсии", format: formatInt },
  { key: "clicks", label: "Клики", format: formatInt },
  { key: "impressions", label: "Показы", format: formatInt },
  { key: "ctr", label: "CTR", format: formatPercent },
];

// Single-series bar colour — an accessible blue on the light chart surface.
const BAR_COLOR = "#2563eb";

// Cap the number of bars so the chart stays readable; the rest are summarised.
const MAX_BARS = 12;

interface ChartRow {
  name: string;
  account: string;
  value: number;
}

interface CampaignsChartProps {
  accounts: AccountStats[];
}

export function CampaignsChart({ accounts }: CampaignsChartProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>("cost");
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const allRows = useMemo(
    () =>
      accounts.flatMap((a) =>
        a.rows.map((r) => ({
          name: r.campaignName,
          account: a.label,
          value: {
            cost: r.cost,
            cpa: r.conversions > 0 ? r.cost / r.conversions : 0,
            conversions: r.conversions,
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
          }[metricKey],
        })),
      ),
    [accounts, metricKey],
  );

  const rows: ChartRow[] = useMemo(() => {
    const sorted = [...allRows].sort((a, b) => b.value - a.value);
    return sorted.slice(0, MAX_BARS);
  }, [allRows]);

  const truncated = allRows.length - rows.length;

  if (allRows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
        Нет данных по кампаниям за выбранный период.
      </div>
    );
  }

  // Height scales with the number of bars so labels never crowd.
  const chartHeight = Math.max(220, rows.length * 38 + 40);

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Кампании по метрике: {metric.label}
        </h2>
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                m.key === metricKey
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="#eef1f5"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number"
              tickFormatter={(v) => metric.format(Number(v))}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              stroke="#d1d5db"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11, fill: "#374151" }}
              tickFormatter={(v: string) =>
                v.length > 26 ? `${v.slice(0, 25)}…` : v
              }
              stroke="#d1d5db"
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(value) => [metric.format(Number(value)), metric.label]}
              labelFormatter={(label, payload) => {
                const acc = payload?.[0]?.payload?.account as string | undefined;
                return acc ? `${String(label)} · ${acc}` : String(label);
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]}>
              {rows.map((r) => (
                <Cell key={`${r.account}-${r.name}`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {truncated > 0 && (
        <p className="text-xs text-gray-400">
          Показаны топ-{MAX_BARS} кампаний по метрике «{metric.label}». Ещё{" "}
          {truncated} скрыто.
        </p>
      )}
    </div>
  );
}
