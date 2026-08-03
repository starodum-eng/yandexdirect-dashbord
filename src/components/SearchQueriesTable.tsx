"use client";

import { useMemo, useState } from "react";
import type { AccountSearchQueries, SearchQueryRow } from "@/types/yandex";
import { formatCpa, formatInt, formatMoney } from "@/lib/format";

interface EnrichedRow extends SearchQueryRow {
  accountLabel: string;
  cpa: number;
}

type SortKey =
  | "accountLabel"
  | "campaignName"
  | "query"
  | "cost"
  | "impressions"
  | "clicks"
  | "conversions"
  | "cpa";
type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: Column[] = [
  { key: "accountLabel", label: "Кабинет", numeric: false },
  { key: "campaignName", label: "Кампания", numeric: false },
  { key: "query", label: "Поисковый запрос", numeric: false },
  { key: "cost", label: "Расход", numeric: true },
  { key: "impressions", label: "Показы", numeric: true },
  { key: "clicks", label: "Клики", numeric: true },
  { key: "conversions", label: "Лиды", numeric: true },
  { key: "cpa", label: "Цена лида", numeric: true },
];

interface SearchQueriesTableProps {
  accounts: AccountSearchQueries[];
}

// Search-query table with click-to-sort headers and a text filter on the query.
export function SearchQueriesTable({ accounts }: SearchQueriesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [queryFilter, setQueryFilter] = useState("");

  const rows = useMemo<EnrichedRow[]>(
    () =>
      accounts.flatMap((a) =>
        a.rows.map((r) => ({
          ...r,
          accountLabel: a.label,
          cpa: r.conversions > 0 ? r.cost / r.conversions : 0,
        })),
      ),
    [accounts],
  );

  const filtered = useMemo(() => {
    const q = queryFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.query.toLowerCase().includes(q));
  }, [rows, queryFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "ru");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
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
        Нет поисковых запросов за выбранный период.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={queryFilter}
        onChange={(e) => setQueryFilter(e.target.value)}
        placeholder="Фильтр по запросу…"
        className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
      />
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full min-w-[900px] text-sm">
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
            {sorted.map((r, i) => (
              <tr
                key={`${r.accountLabel}-${r.campaignName}-${r.query}-${i}`}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-gray-500">{r.accountLabel}</td>
                <td className="px-4 py-3 text-gray-700">{r.campaignName}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.query}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(r.cost)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatInt(r.impressions)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatInt(r.clicks)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatInt(r.conversions)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCpa(r.cpa, r.conversions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Показаны топ-запросы по расходу (до 500 на кабинет).
      </p>
    </div>
  );
}
