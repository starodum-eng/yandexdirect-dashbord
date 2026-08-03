"use client";

import type { PublicAccount } from "@/lib/accounts";
import type { StatsFilters } from "@/hooks/useStats";
import { PRESETS, matchPreset, presetRange } from "@/lib/dateRanges";

interface FilterBarProps {
  accounts: PublicAccount[];
  filters: StatsFilters;
  onChange: (next: StatsFilters) => void;
  onRefresh: () => void;
  loading: boolean;
}

// Date range (with quick presets) + account filter + "refresh data" button.
// Lays out as a single row on desktop and stacks cleanly on mobile.
export function FilterBar({
  accounts,
  filters,
  onChange,
  onRefresh,
  loading,
}: FilterBarProps) {
  const active = matchPreset({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  // Distinct client names for the client filter.
  const clients = [
    ...new Set(
      accounts
        .map((a) => a.client)
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort((a, b) => a.localeCompare(b, "ru"));

  // Account options narrow to the selected client.
  const accountOptions =
    filters.client === "all"
      ? accounts
      : accounts.filter((a) => a.client === filters.client);

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      {/* Quick presets — wrap and scroll-free on small screens */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const isActive = active === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onChange({ ...filters, ...presetRange(p.key) })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Explicit dates + account + refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-1 gap-3 sm:flex-none">
          <div className="flex flex-1 flex-col sm:flex-none">
            <label className="mb-1 text-xs font-medium text-gray-500">
              С даты
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo}
              onChange={(e) =>
                onChange({ ...filters, dateFrom: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
            />
          </div>

          <div className="flex flex-1 flex-col sm:flex-none">
            <label className="mb-1 text-xs font-medium text-gray-500">
              По дату
            </label>
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
            />
          </div>
        </div>

        {clients.length > 0 && (
          <div className="flex flex-col sm:flex-none">
            <label className="mb-1 text-xs font-medium text-gray-500">
              Клиент
            </label>
            <select
              value={filters.client}
              onChange={(e) =>
                // Changing client resets the account filter to "all".
                onChange({ ...filters, client: e.target.value, account: "all" })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark sm:w-auto"
            >
              <option value="all">Все клиенты</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col sm:flex-none">
          <label className="mb-1 text-xs font-medium text-gray-500">
            Кабинет
          </label>
          <select
            value={filters.account}
            onChange={(e) => onChange({ ...filters, account: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark sm:w-auto"
          >
            <option value="all">Все кабинеты</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60 sm:ml-auto sm:w-auto"
        >
          {loading ? "Обновление…" : "Обновить данные"}
        </button>
      </div>
    </div>
  );
}
