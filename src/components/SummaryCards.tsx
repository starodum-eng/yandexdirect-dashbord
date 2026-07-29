import type { StatsTotals } from "@/types/yandex";
import {
  formatBalance,
  formatCpa,
  formatInt,
  formatMoney,
  formatPercent,
} from "@/lib/format";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";

interface SummaryCardsProps {
  totals: StatsTotals;
  // Total balance across the selected accounts; null when unknown.
  balance?: number | null;
}

// KPI row: impressions, clicks, cost, CTR, conversions, CPA, and balance.
// The grid auto-fits columns so any card count wraps cleanly on any width.
export function SummaryCards({ totals, balance }: SummaryCardsProps) {
  const lowBalance =
    balance !== undefined && balance !== null && balance < LOW_BALANCE_THRESHOLD;

  const cards = [
    { label: "Показы", value: formatInt(totals.impressions) },
    { label: "Клики", value: formatInt(totals.clicks) },
    { label: "Расход", value: formatMoney(totals.cost) },
    { label: "CTR", value: formatPercent(totals.ctr) },
    { label: "Конверсии", value: formatInt(totals.conversions) },
    {
      label: "CPA (цена лида)",
      value: formatCpa(totals.cpa, totals.conversions),
    },
    ...(balance !== undefined
      ? [{ label: "Баланс", value: formatBalance(balance), warn: lowBalance }]
      : []),
  ];

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(165px,1fr))]">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl p-4 shadow-sm ring-1 ${
            "warn" in c && c.warn
              ? "bg-amber-50 ring-amber-300"
              : "bg-white ring-gray-200"
          }`}
        >
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {c.label}
          </div>
          <div
            className={`mt-2 whitespace-nowrap text-lg font-semibold ${
              "warn" in c && c.warn ? "text-amber-700" : "text-gray-900"
            }`}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
