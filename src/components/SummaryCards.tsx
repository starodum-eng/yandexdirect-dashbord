import type { StatsTotals } from "@/types/yandex";
import { formatInt, formatMoney, formatPercent } from "@/lib/format";

interface SummaryCardsProps {
  totals: StatsTotals;
}

// KPI row: impressions, clicks, cost, CTR, conversions.
export function SummaryCards({ totals }: SummaryCardsProps) {
  const cards = [
    { label: "Показы", value: formatInt(totals.impressions) },
    { label: "Клики", value: formatInt(totals.clicks) },
    { label: "Расход", value: formatMoney(totals.cost) },
    { label: "CTR", value: formatPercent(totals.ctr) },
    { label: "Конверсии", value: formatInt(totals.conversions) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {c.label}
          </div>
          <div className="mt-2 text-xl font-semibold text-gray-900">
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
