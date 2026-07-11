// Number/date formatting helpers (ru-RU locale).

const numberFmt = new Intl.NumberFormat("ru-RU");
const moneyFmt = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatInt(n: number): string {
  return numberFmt.format(Math.round(n));
}

export function formatMoney(n: number): string {
  return `${moneyFmt.format(n)} ₽`;
}

export function formatPercent(n: number): string {
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;
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

// Returns YYYY-MM-DD for a date offset by `days` from today.
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
