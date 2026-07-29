// Quick date-range presets for the dashboard filter.
// All ranges are computed in the viewer's local time and returned as inclusive
// YYYY-MM-DD boundaries.

export type PresetKey =
  | "today"
  | "yesterday"
  | "lastWeek"
  | "last30"
  | "last3m";

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

export interface Preset {
  key: PresetKey;
  label: string;
}

export const PRESETS: Preset[] = [
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "lastWeek", label: "Прошлая неделя" },
  { key: "last30", label: "Последние 30 дней" },
  { key: "last3m", label: "Последние 3 мес" },
];

// Local-time YYYY-MM-DD (avoids the UTC off-by-one of toISOString).
export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Returns the inclusive [from, to] boundaries for a preset, relative to today.
export function presetRange(key: PresetKey, today = new Date()): DateRange {
  switch (key) {
    case "today":
      return { dateFrom: toIso(today), dateTo: toIso(today) };

    case "yesterday": {
      const y = addDays(today, -1);
      return { dateFrom: toIso(y), dateTo: toIso(y) };
    }

    case "lastWeek": {
      // Previous calendar week, Monday–Sunday.
      const dow = (today.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
      const thisMonday = addDays(today, -dow);
      const lastMonday = addDays(thisMonday, -7);
      const lastSunday = addDays(lastMonday, 6);
      return { dateFrom: toIso(lastMonday), dateTo: toIso(lastSunday) };
    }

    case "last30":
      return { dateFrom: toIso(addDays(today, -29)), dateTo: toIso(today) };

    case "last3m": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: toIso(from), dateTo: toIso(today) };
    }
  }
}

// If the given range exactly matches a preset, returns that preset's key.
export function matchPreset(
  range: DateRange,
  today = new Date(),
): PresetKey | null {
  for (const { key } of PRESETS) {
    const r = presetRange(key, today);
    if (r.dateFrom === range.dateFrom && r.dateTo === range.dateTo) {
      return key;
    }
  }
  return null;
}
