"use client";

import { useMemo, useState } from "react";
import type { AccountStats, CampaignRow } from "@/types/yandex";
import { formatInt, formatMoney, formatPercent } from "@/lib/format";

// A campaign row enriched with its owning account label.
interface EnrichedRow extends CampaignRow {
  accountLabel: string;
}

type SortKey =
  | "accountLabel"
  | "campaignName"
  | "impressions"
  | "clicks"
  | "cost"
  | "ctr"
  | "conversions";

type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: Column[] = [
  { key: "accountLabel", label: "Кабинет", numeric: false },
  { key: "campaignName", label: "Кампания", numeric: false },
  { key: "impressions", label: "Показы", numeric: true },
  { key: "clicks", label: "Клики", numeric: true },
  { key: "cost", label: "Расход", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
  { key: "conversions", label: "Конверсии", numeric: true },
];

interface CampaignsTableProps {
  accounts: AccountStats[];
}

// Campaign table with click-to-sort headers across all accounts.
export function CampaignsTable({ accounts }: CampaignsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo<EnrichedRow[]>(
    () =>
      accounts.flatMap((a) =>
        a.rows.map((r) => ({ ...r, accountLabel: a.label })),
      ),
    [accounts],
  );

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "ru");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numeric columns default to descending, text to ascending.
      const col = COLUMNS.find((c) => c.key === key);
      setSortDir(col?.numeric ? "desc" : "asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
        Нет данных по кампаниям за выбранный период.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className={`cursor-pointer select-none px-4 py-3 font-medium hover:text-gray-900 ${
                  c.numeric ? "text-right" : "text-left"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  <span className="text-gray-400">{sortIndicator(c.key)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={`${r.accountLabel}-${r.campaignId}`}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-3 text-gray-500">{r.accountLabel}</td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {r.campaignName}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(r.impressions)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(r.clicks)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(r.cost)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatPercent(r.ctr)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(r.conversions)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
