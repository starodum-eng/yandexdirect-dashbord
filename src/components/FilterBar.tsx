"use client";

import type { PublicAccount } from "@/lib/accounts";
import type { StatsFilters } from "@/hooks/useStats";

interface FilterBarProps {
  accounts: PublicAccount[];
  filters: StatsFilters;
  onChange: (next: StatsFilters) => void;
  onRefresh: () => void;
  loading: boolean;
}

// Date range + account filter + "refresh data" button.
export function FilterBar({
  accounts,
  filters,
  onChange,
  onRefresh,
  loading,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col">
        <label className="mb-1 text-xs font-medium text-gray-500">С даты</label>
        <input
          type="date"
          value={filters.dateFrom}
          max={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-xs font-medium text-gray-500">По дату</label>
        <input
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-xs font-medium text-gray-500">Кабинет</label>
        <select
          value={filters.account}
          onChange={(e) => onChange({ ...filters, account: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-dark"
        >
          <option value="all">Все кабинеты</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? "Обновление…" : "Обновить данные"}
      </button>
    </div>
  );
}
