"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInt, formatMoney, formatPercent } from "@/lib/format";

// Reusable single-series bar chart with a metric switcher. Used for both the
// per-account and per-campaign charts. Following the dataviz guidance: one job
// (magnitude comparison) → horizontal bars, sorted; one colour (no legend for a
// single series); recessive grid; per-bar hover tooltip.

export type MetricKey =
  | "cost"
  | "cpa"
  | "conversions"
  | "clicks"
  | "impressions"
  | "ctr";

interface Metric {
  key: MetricKey;
  label: string;
  format: (n: number) => string;
}

export const METRICS: Metric[] = [
  { key: "cost", label: "Расход", format: formatMoney },
  { key: "cpa", label: "CPA", format: formatMoney },
  { key: "conversions", label: "Конверсии", format: formatInt },
  { key: "clicks", label: "Клики", format: formatInt },
  { key: "impressions", label: "Показы", format: formatInt },
  { key: "ctr", label: "CTR", format: formatPercent },
];

// Single-series bar colour — an accessible blue on the light chart surface.
const BAR_COLOR = "#2563eb";

// One entry to plot, with every metric value precomputed.
export interface MetricItem {
  name: string;
  sub?: string; // secondary label (e.g. the account a campaign belongs to)
  values: Record<MetricKey, number>;
}

interface MetricBarChartProps {
  title: string; // e.g. "Аккаунты" or "Кампании" — the metric name is appended
  items: MetricItem[];
  maxBars?: number; // cap the number of bars for readability
  emptyText?: string;
}

export function MetricBarChart({
  title,
  items,
  maxBars = 12,
  emptyText = "Нет данных за выбранный период.",
}: MetricBarChartProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>("cost");
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const rows = useMemo(() => {
    const mapped = items.map((it) => ({
      name: it.name,
      sub: it.sub,
      value: it.values[metricKey],
    }));
    mapped.sort((a, b) => b.value - a.value);
    return mapped.slice(0, maxBars);
  }, [items, metricKey, maxBars]);

  const truncated = items.length - rows.length;

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
        {emptyText}
      </div>
    );
  }

  // Height scales with the number of bars so labels never crowd.
  const chartHeight = Math.max(200, rows.length * 38 + 40);

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          {title} по метрике: {metric.label}
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
                const sub = payload?.[0]?.payload?.sub as string | undefined;
                return sub ? `${String(label)} · ${sub}` : String(label);
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {truncated > 0 && (
        <p className="text-xs text-gray-400">
          Показаны топ-{maxBars} по метрике «{metric.label}». Ещё {truncated}{" "}
          скрыто.
        </p>
      )}
    </div>
  );
}
