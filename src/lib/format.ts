// Number/date formatting helpers (ru-RU locale).

const numberFmt = new Intl.NumberFormat("ru-RU");
const moneyFmt = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInt(n: number): string {
  return numberFmt.format(Math.round(n));
}

// A non-breaking space keeps the value glued to its unit (₽ / %) so the unit
// never wraps onto the next line. ru-RU grouping already uses a no-break space
// between digit groups, so the whole value stays on one line.
const NBSP = "\u00A0";

export function formatMoney(n: number): string {
  return `${moneyFmt.format(n)}${NBSP}₽`;
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}${NBSP}%`;
}

// CPA (cost per acquisition). Shows a dash when there are no conversions,
// since cost-per-nothing is undefined rather than zero.
export function formatCpa(cpa: number, conversions: number): string {
  if (conversions <= 0) return "—";
  return formatMoney(cpa);
}

// Account balance. Null means the balance couldn't be retrieved (e.g. the token
// lacks the financial permission), shown as a dash.
export function formatBalance(balance: number | null): string {
  if (balance === null) return "—";
  return formatMoney(balance);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
