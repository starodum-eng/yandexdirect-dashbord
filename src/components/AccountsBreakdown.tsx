import type { AccountStats } from "@/types/yandex";
import {
  formatBalance,
  formatCpa,
  formatDateTime,
  formatInt,
  formatMoney,
  formatPercent,
} from "@/lib/format";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";

interface AccountsBreakdownProps {
  accounts: AccountStats[];
}

// Per-account summary table shown on the overview page.
export function AccountsBreakdown({ accounts }: AccountsBreakdownProps) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 font-medium">Кабинет</th>
            <th className="px-4 py-3 text-right font-medium">Показы</th>
            <th className="px-4 py-3 text-right font-medium">Клики</th>
            <th className="px-4 py-3 text-right font-medium">Расход</th>
            <th className="px-4 py-3 text-right font-medium">CTR</th>
            <th className="px-4 py-3 text-right font-medium">Конверсии</th>
            <th className="px-4 py-3 text-right font-medium">CPA</th>
            <th className="px-4 py-3 text-right font-medium">Баланс</th>
            <th className="px-4 py-3 text-right font-medium">Обновлено</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr
              key={a.accountId}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{a.label}</div>
                {a.error && (
                  <div className="mt-0.5 text-xs text-amber-600">{a.error}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(a.totals.impressions)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(a.totals.clicks)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(a.totals.cost)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatPercent(a.totals.ctr)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInt(a.totals.conversions)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCpa(a.totals.cpa, a.totals.conversions)}
              </td>
              <td
                className={`px-4 py-3 text-right tabular-nums ${
                  a.balance !== null && a.balance < LOW_BALANCE_THRESHOLD
                    ? "font-semibold text-amber-700"
                    : ""
                }`}
              >
                {formatBalance(a.balance)}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-500">
                {formatDateTime(a.refreshedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
