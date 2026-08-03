// Shared types for Yandex.Direct statistics.

// One row of the campaign report (per campaign).
export interface CampaignRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number; // in account currency (returnMoneyInMicros=false)
  ctr: number; // percent
  conversions: number;
}

// Aggregated totals across a set of campaign rows.
export interface StatsTotals {
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number; // recomputed from totals: clicks / impressions * 100
  conversions: number;
  cpa: number; // cost per acquisition: cost / conversions (0 when no conversions)
}

// Per-account result returned by the stats API.
export interface AccountStats {
  accountId: string;
  label: string;
  client: string | null; // owning client (from YANDEX_CLIENTS), if any
  totals: StatsTotals;
  rows: CampaignRow[];
  refreshedAt: string | null; // ISO timestamp of the cached snapshot
  balance: number | null; // shared-account balance; null if unavailable
  error?: string; // populated if fetching this account failed
}

// Full response of GET /api/stats.
export interface StatsResponse {
  dateFrom: string;
  dateTo: string;
  totals: StatsTotals;
  totalBalance: number | null; // sum of known account balances; null if none known
  accounts: AccountStats[];
}
